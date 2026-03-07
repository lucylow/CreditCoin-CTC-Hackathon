# backend/app/depin/database.py
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings
from app.depin.models import Base

_engine = None
_SessionLocal = None


def get_depin_engine():
    global _engine
    if _engine is None:
        uri = settings.DEPIN_DATABASE_URI or "sqlite:///./depin.db"
        _engine = create_engine(
            uri,
            connect_args={"check_same_thread": False} if "sqlite" in uri else {},
            echo=settings.DEBUG,
        )
    return _engine


def get_depin_session_factory():
    global _SessionLocal
    if _SessionLocal is None:
        engine = get_depin_engine()
        Base.metadata.create_all(bind=engine)
        _SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return _SessionLocal


@contextmanager
def depin_session() -> Generator[Session, None, None]:
    factory = get_depin_session_factory()
    session = factory()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_depin_db() -> Generator[Session, None, None]:
    """FastAPI dependency: yield a SQLAlchemy session for DePIN. Routes commit explicitly."""
    factory = get_depin_session_factory()
    session = factory()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
