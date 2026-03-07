# backend/app/depin/router.py
import hashlib
import json
from datetime import datetime


from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.config import settings
from app.depin.auth import verify_device_signature
from app.depin.database import get_depin_db
from app.depin.models import Device, EdgeInference, ModelVersion, ScreeningTask, SensorData
from app.depin.schemas import (
    DeviceRegisterRequest,
    InferenceResultRequest,
    ModelVersionRequest,
    SensorDataRequest,
    TaskCreateRequest,
)
from app.depin.services import anchor_hash, pin_to_ipfs

router = APIRouter(prefix="/api/depin", tags=["depin"])


@router.post("/device/register")
def register_device(
    req: DeviceRegisterRequest,
    db: Session = Depends(get_depin_db),
):
    """Register a DePIN sensor or edge device (public key stored for signature verification)."""
    existing = db.query(Device).filter(Device.device_id == req.device_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Device already registered")
    now = datetime.utcnow()
    device = Device(
        device_id=req.device_id,
        device_type=req.device_type,
        owner_wallet=req.owner_wallet,
        public_key=req.public_key,
        firmware_version=req.firmware_version or "",
        registered_at=now,
        last_seen=now,
        active=True,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return {"message": "Device registered", "device_id": device.device_id}


@router.post("/sensor/data")
async def post_sensor_data(
    request: Request,
    device: Device = Depends(verify_device_signature),
    db: Session = Depends(get_depin_db),
):
    """Ingest sensor data (authenticated by device signature). Optionally pin to IPFS and anchor on blockchain."""
    raw = getattr(request.state, "depin_body", b"{}")
    try:
        data = SensorDataRequest(**json.loads(raw))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid sensor payload: {e}")
    ts = datetime.fromtimestamp(data.timestamp) if data.timestamp else datetime.utcnow()
    payload_str = f"{data.timestamp}{data.data_type}{data.value_float or data.value_str or ''}{data.unit or ''}{device.device_id}"
    data_hash = hashlib.sha3_256(payload_str.encode()).hexdigest()

    # Optional IPFS
    ipfs_cid = None
    if getattr(settings, "DEPIN_PIN_SENSOR_DATA", True):
        ipfs_cid = await pin_to_ipfs(data.dict())

    # Optional blockchain anchor
    tx_hash = None
    if getattr(settings, "DEPIN_ANCHOR_SENSOR_DATA", False):
        tx_hash = await anchor_hash(data_hash)

    record = SensorData(
        device_id=device.id,
        timestamp=ts,
        data_type=data.data_type,
        value_float=data.value_float,
        value_str=data.value_str,
        unit=data.unit,
        data_hash=data_hash,
        ipfs_cid=ipfs_cid,
        tx_hash=tx_hash,
    )
    db.add(record)
    db.commit()
    return {
        "status": "ok",
        "data_hash": data_hash,
        "ipfs_cid": ipfs_cid,
        "tx_hash": tx_hash,
    }


@router.post("/model")
def register_model_version(
    req: ModelVersionRequest,
    db: Session = Depends(get_depin_db),
):
    """Register an edge model version (IPFS CID). If active=True, deactivates other versions."""
    if req.active:
        db.query(ModelVersion).filter(ModelVersion.active == True).update({"active": False})
    model = ModelVersion(version=req.version, ipfs_cid=req.ipfs_cid, active=req.active)
    db.add(model)
    db.commit()
    db.refresh(model)
    return {"version": model.version, "ipfs_cid": model.ipfs_cid, "active": model.active}


@router.get("/model/latest")
def get_latest_model(db: Session = Depends(get_depin_db)):
    """Return the latest active edge model version and IPFS CID for download."""
    model = db.query(ModelVersion).filter(ModelVersion.active == True).first()
    if not model:
        raise HTTPException(status_code=404, detail="No active model")
    return {"version": model.version, "ipfs_cid": model.ipfs_cid}


@router.post("/task")
def create_task(
    payload: TaskCreateRequest,
    db: Session = Depends(get_depin_db),
):
    """Create a pending screening task (sensor_data_ids = list of sensor data record IDs)."""
    sensor_data_ids = payload.sensor_data_ids
    task_id = f"task-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{abs(hash(str(sensor_data_ids))) % 10**6}"
    task = ScreeningTask(
        task_id=task_id,
        sensor_data_ids=json.dumps(sensor_data_ids),
        status="pending",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return {"task_id": task.task_id, "status": "pending"}


@router.get("/task/next")
def get_next_task(
    device: Device = Depends(verify_device_signature),
    db: Session = Depends(get_depin_db),
):
    """Assign the next pending screening task to this edge device."""
    task = db.query(ScreeningTask).filter(ScreeningTask.status == "pending").first()
    if not task:
        return {"task": None}
    task.status = "assigned"
    task.assigned_at = datetime.utcnow()
    task.device_id = device.id
    db.commit()
    ids = []
    if task.sensor_data_ids:
        try:
            ids = json.loads(task.sensor_data_ids)
        except Exception:
            ids = []
    return {"task_id": task.task_id, "sensor_data_ids": ids}


@router.post("/inference/result")
async def submit_inference(
    request: Request,
    device: Device = Depends(verify_device_signature),
    db: Session = Depends(get_depin_db),
):
    """Submit edge inference result; optionally pin to IPFS and anchor on blockchain."""
    raw = getattr(request.state, "depin_body", b"{}")
    try:
        result = InferenceResultRequest(**json.loads(raw))
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Invalid inference payload: {e}")

    output_str = json.dumps(result.output_json, sort_keys=True)
    data_hash = hashlib.sha3_256(
        (output_str + device.device_id + result.task_id).encode()
    ).hexdigest()

    ipfs_cid = None
    if getattr(settings, "DEPIN_PIN_SENSOR_DATA", True):
        ipfs_cid = await pin_to_ipfs(result.output_json)

    tx_hash = None
    if getattr(settings, "DEPIN_ANCHOR_INFERENCE", False):
        tx_hash = await anchor_hash(data_hash)

    inference = EdgeInference(
        device_id=device.id,
        screening_id=result.task_id,
        timestamp=datetime.utcnow(),
        model_version="latest",
        input_data_hash="",
        output_json=output_str,
        confidence=result.confidence,
        risk_level=result.risk_level,
        data_hash=data_hash,
        ipfs_cid=ipfs_cid,
        tx_hash=tx_hash,
    )
    db.add(inference)

    task = db.query(ScreeningTask).filter(ScreeningTask.task_id == result.task_id).first()
    if task:
        task.status = "completed"
        task.completed_at = datetime.utcnow()
    db.commit()
    return {"status": "ok", "data_hash": data_hash, "ipfs_cid": ipfs_cid, "tx_hash": tx_hash}


def _depin_db_available() -> bool:
    try:
        return bool(settings.DEPIN_DATABASE_URI) or True
    except Exception:
        return False
