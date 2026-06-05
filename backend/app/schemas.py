from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ClaimCreate(BaseModel):
    member_id: str
    family_id: str | None = None
    member_name: str
    treatment_date: str
    claim_amount: int = Field(..., ge=0)
    member_join_date: str | None = None
    submission_date: str | None = None
    hospital: str | None = None
    cashless_request: bool = False
    previous_claims_same_day: int = 0
    pre_authorized: bool = False
    documents: dict[str, Any] = Field(default_factory=dict)
    metadata: dict[str, Any] = Field(default_factory=dict)


class ClaimResponse(BaseModel):
    claim_id: str
    status: str
    member_id: str
    family_id: str | None = None
    member_name: str
    treatment_date: str
    claim_amount: int
    hospital: str | None = None
    input_payload: dict[str, Any]
    extracted_payload: dict[str, Any]
    decision_payload: dict[str, Any] | None = None
    notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AdjudicationDecision(BaseModel):
    claim_id: str
    decision: str
    approved_amount: int
    rejection_reasons: list[str] = Field(default_factory=list)
    deductions: dict[str, int] = Field(default_factory=dict)
    flags: list[str] = Field(default_factory=list)
    confidence_score: float
    notes: str = ""
    next_steps: str = ""
    audit_trace: list[dict[str, Any]] = Field(default_factory=list)
    cashless_approved: bool = False
    line_item_decisions: list[dict[str, Any]] = Field(default_factory=list)


class TestCaseResult(BaseModel):
    case_id: str
    case_name: str
    expected_decision: str
    actual_decision: str
    passed: bool
    amount_check: bool
    expected_approved_amount: int | None = None
    actual_approved_amount: int | None = None
    notes: str = ""
    confidence_score: float


class AdminSummary(BaseModel):
    total_claims: int
    approved: int
    rejected: int
    partial: int
    manual_review: int
    total_claimed_amount: int
    total_approved_amount: int
    average_confidence: float
    recent_flags: list[str]
    ai_provider: str
