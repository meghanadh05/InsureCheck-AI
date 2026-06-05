from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import get_settings


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.resolved_database_url.startswith("sqlite") else {}
engine = create_engine(settings.resolved_database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def ensure_schema() -> None:
    inspector = inspect(engine)
    if "claims" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("claims")}
    with engine.begin() as connection:
        if "family_id" not in columns:
            connection.execute(text("ALTER TABLE claims ADD COLUMN family_id VARCHAR(64)"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
