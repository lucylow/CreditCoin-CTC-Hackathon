# backend/app/depin/models.py
from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class Device(Base):
    __tablename__ = "depin_devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String(256), unique=True, index=True)
    device_type = Column(String(64))
    owner_wallet = Column(String(128))
    public_key = Column(Text)
    registered_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, nullable=True)
    firmware_version = Column(String(64), nullable=True)
    active = Column(Boolean, default=True)

    sensor_data = relationship("SensorData", back_populates="device")
    edge_inferences = relationship("EdgeInference", back_populates="device")


class SensorData(Base):
    __tablename__ = "depin_sensor_data"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("depin_devices.id"))
    timestamp = Column(DateTime, index=True)
    data_type = Column(String(64))
    value_float = Column(Float, nullable=True)
    value_str = Column(String(512), nullable=True)
    unit = Column(String(32), nullable=True)
    data_hash = Column(String(128), unique=True)
    ipfs_cid = Column(String(128), nullable=True)
    tx_hash = Column(String(128), nullable=True)

    device = relationship("Device", back_populates="sensor_data")


class EdgeInference(Base):
    __tablename__ = "depin_edge_inferences"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("depin_devices.id"))
    screening_id = Column(String(128), index=True)
    timestamp = Column(DateTime, index=True)
    model_version = Column(String(64))
    input_data_hash = Column(String(128), nullable=True)
    output_json = Column(Text)
    confidence = Column(Float, nullable=True)
    risk_level = Column(String(32), nullable=True)
    data_hash = Column(String(128), unique=True)
    ipfs_cid = Column(String(128), nullable=True)
    tx_hash = Column(String(128), nullable=True)

    device = relationship("Device", back_populates="edge_inferences")


class ModelVersion(Base):
    __tablename__ = "depin_model_versions"

    id = Column(Integer, primary_key=True, index=True)
    version = Column(String(64), unique=True)
    ipfs_cid = Column(String(128))
    created_at = Column(DateTime, default=datetime.utcnow)
    active = Column(Boolean, default=False)


class ScreeningTask(Base):
    __tablename__ = "depin_screening_tasks"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(128), unique=True, index=True)
    sensor_data_ids = Column(Text)
    device_id = Column(Integer, ForeignKey("depin_devices.id"), nullable=True)
    status = Column(String(32))
    created_at = Column(DateTime, default=datetime.utcnow)
    assigned_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
