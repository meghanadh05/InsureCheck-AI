from datetime import datetime

from sqlalchemy import JSON, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class ClaimRecord(Base):
    __tablename__ = "claims"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    claim_id: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="SUBMITTED")
    member_id: Mapped[str] = mapped_column(String(64), index=True)
    family_id: Mapped[str | None] = mapped_column(String(64), index=True, nullable=True)
    member_name: Mapped[str] = mapped_column(String(128))
    treatment_date: Mapped[str] = mapped_column(String(32))
    claim_amount: Mapped[int] = mapped_column(Integer)
    hospital: Mapped[str | None] = mapped_column(String(128), nullable=True)
    input_payload: Mapped[dict] = mapped_column(JSON)
    extracted_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    decision_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
