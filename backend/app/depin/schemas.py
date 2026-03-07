# backend/app/depin/schemas.py
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DeviceRegisterRequest(BaseModel):
    device_id: str
    device_type: str
    owner_wallet: str
    public_key: str
    firmware_version: Optional[str] = None


class SensorDataRequest(BaseModel):
    timestamp: int
    data_type: str
    value_float: Optional[float] = None
    value_str: Optional[str] = None
    unit: Optional[str] = None


class InferenceResultRequest(BaseModel):
    task_id: str
    output_json: Dict[str, Any]
    confidence: float
    risk_level: str
