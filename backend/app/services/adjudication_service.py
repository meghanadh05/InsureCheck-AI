from uuid import uuid4

from sqlalchemy.orm import Session
from datetime import date

from ..models import ClaimRecord
from ..rules.engine import adjudicate_claim
from .ai_extractor import extractor, merge_extracted_into_claim
from .policy_loader import get_policy_terms


def new_claim_id() -> str:
    return f"CLM_{uuid4().hex[:8].upper()}"


def create_claim(db: Session, payload: dict) -> ClaimRecord:
    extracted = extractor.extract(payload)
    family_id = payload.get("family_id") or (payload.get("metadata", {}) or {}).get("family_id")
    claim = ClaimRecord(
        claim_id=new_claim_id(),
        status="SUBMITTED",
        member_id=payload["member_id"],
        family_id=family_id,
        member_name=payload["member_name"],
        treatment_date=payload["treatment_date"],
        claim_amount=payload["claim_amount"],
        hospital=payload.get("hospital"),
        input_payload=payload,
        extracted_payload=extracted,
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def refresh_extraction(db: Session, claim: ClaimRecord) -> ClaimRecord:
    claim.extracted_payload = extractor.extract(claim.input_payload)
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def adjudicate_record(db: Session, claim: ClaimRecord) -> ClaimRecord:
    duplicate_claim_detected = (
        db.query(ClaimRecord)
        .filter(
            ClaimRecord.claim_id != claim.claim_id,
            ClaimRecord.member_id == claim.member_id,
            ClaimRecord.treatment_date == claim.treatment_date,
            ClaimRecord.claim_amount == claim.claim_amount,
        )
        .count()
        > 0
    )
    claim_context = merge_extracted_into_claim(claim.input_payload, claim.extracted_payload or {})
    claim_context.setdefault("metadata", {})
    family_id = claim.family_id or claim_context.get("family_id") or claim.member_id
    claim_context["family_id"] = family_id
    claim_context["metadata"]["family_id"] = family_id
    claim_context["metadata"]["duplicate_claim_detected"] = duplicate_claim_detected
    treatment_year = date.fromisoformat(claim.treatment_date).year
    historical_approved_amount = 0
    family_approved_amount = 0
    for existing_claim in (
        db.query(ClaimRecord)
        .filter(
            ClaimRecord.claim_id != claim.claim_id,
            (ClaimRecord.member_id == claim.member_id) | (ClaimRecord.family_id == family_id),
        )
        .all()
    ):
        if (
            existing_claim.decision_payload
            and existing_claim.treatment_date
            and date.fromisoformat(existing_claim.treatment_date).year == treatment_year
        ):
            approved_amount = int((existing_claim.decision_payload or {}).get("approved_amount", 0))
            if existing_claim.member_id == claim.member_id:
                historical_approved_amount += approved_amount
            if (existing_claim.family_id or existing_claim.member_id) == family_id:
                family_approved_amount += approved_amount
    claim_context["metadata"]["member_approved_amount_ytd"] = historical_approved_amount
    claim_context["metadata"]["family_approved_amount_ytd"] = family_approved_amount
    decision = adjudicate_claim(claim.claim_id, claim_context, get_policy_terms())
    claim.status = decision["decision"]
    claim.decision_payload = decision
    claim.notes = decision["notes"]
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim
