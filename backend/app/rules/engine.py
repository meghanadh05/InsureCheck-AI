from typing import Any

from .coverage import evaluate_coverage
from .documents import evaluate_documents
from .eligibility import evaluate_eligibility
from .fraud import evaluate_fraud
from .limits import evaluate_limits
from .medical import evaluate_medical_necessity


def adjudicate_claim(claim_id: str, claim: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    audit_trace: list[dict[str, Any]] = []
    rejection_reasons: list[str] = []
    notes: list[str] = []
    flags: list[str] = []
    deductions: dict[str, int] = {}

    eligibility = evaluate_eligibility(claim, policy)
    audit_trace.extend(eligibility["trace"])
    rejection_reasons.extend(eligibility["reasons"])
    notes.extend(eligibility["notes"])
    if rejection_reasons:
        return _decision(
            claim_id=claim_id,
            decision="REJECTED",
            approved_amount=0,
            rejection_reasons=sorted(set(rejection_reasons)),
            deductions={},
            flags=[],
            confidence=0.96 if "WAITING_PERIOD" in rejection_reasons else 1.0,
            notes="; ".join(notes),
            next_steps="Review eligibility or waiting period before resubmitting.",
            audit_trace=audit_trace,
        )

    documents = evaluate_documents(claim)
    audit_trace.extend(documents["trace"])
    if documents["reasons"]:
        doc_reason = "Prescription from registered doctor is required" if "MISSING_DOCUMENTS" in documents["reasons"] else "Document validation failed"
        return _decision(
            claim_id=claim_id,
            decision="REJECTED",
            approved_amount=0,
            rejection_reasons=sorted(set(documents["reasons"])),
            deductions={},
            flags=[],
            confidence=1.0 if "MISSING_DOCUMENTS" in documents["reasons"] else 0.9,
            notes=doc_reason,
            next_steps="Upload the missing or corrected documents.",
            audit_trace=audit_trace,
        )

    coverage = evaluate_coverage(claim, policy)
    audit_trace.extend(coverage["trace"])
    covered_items = [item for item in coverage["line_items"] if item["covered"]]
    uncovered_items = [item for item in coverage["line_items"] if not item["covered"]]
    covered_amount = sum(int(item["amount"]) for item in covered_items)
    notes.extend(coverage["notes"])

    if coverage["reasons"]:
        return _decision(
            claim_id=claim_id,
            decision="REJECTED",
            approved_amount=0,
            rejection_reasons=sorted(set(coverage["reasons"])),
            deductions={},
            flags=[],
            confidence=0.94 if "PRE_AUTH_MISSING" in coverage["reasons"] else 0.97,
            notes="; ".join(notes),
            next_steps="Provide the required authorization or submit a covered service.",
            audit_trace=audit_trace,
            line_item_decisions=coverage["line_items"],
        )

    limits = evaluate_limits(claim, policy, coverage["category"], covered_amount)
    audit_trace.extend(limits["trace"])
    deductions.update(limits["deductions"])
    notes.extend(limits["notes"])
    if limits["reasons"]:
        return _decision(
            claim_id=claim_id,
            decision="REJECTED",
            approved_amount=0,
            rejection_reasons=sorted(set(limits["reasons"])),
            deductions=deductions,
            flags=[],
            confidence=0.98,
            notes="; ".join(notes),
            next_steps="Split the claim or resubmit within policy limits.",
            audit_trace=audit_trace,
            line_item_decisions=coverage["line_items"],
        )

    medical = evaluate_medical_necessity(claim)
    audit_trace.extend(medical["trace"])
    if medical["reasons"]:
        return _decision(
            claim_id=claim_id,
            decision="REJECTED",
            approved_amount=0,
            rejection_reasons=medical["reasons"],
            deductions=deductions,
            flags=[],
            confidence=medical["confidence"],
            notes="Medical necessity could not be established.",
            next_steps="Provide stronger clinical justification or additional reports.",
            audit_trace=audit_trace,
            line_item_decisions=coverage["line_items"],
        )

    confidence = min(coverage_confidence(coverage["category"]), medical["confidence"])
    fraud = evaluate_fraud(claim, confidence)
    audit_trace.extend(fraud["trace"])
    flags.extend(fraud["flags"])
    confidence = fraud["confidence"]
    if fraud["reasons"]:
        return _decision(
            claim_id=claim_id,
            decision="REJECTED",
            approved_amount=0,
            rejection_reasons=fraud["reasons"],
            deductions=deductions,
            flags=flags,
            confidence=confidence,
            notes="Duplicate claim detected for the same member, date, and amount.",
            next_steps="Review prior submissions before filing the same claim again.",
            audit_trace=audit_trace,
            line_item_decisions=coverage["line_items"],
        )

    decision = "APPROVED"
    approved_amount = limits["approved_amount"]
    if uncovered_items or "sub_limit_delta" in deductions:
        decision = "PARTIAL"

    if fraud["decision_override"]:
        decision = fraud["decision_override"]

    cashless_approved = bool(
        claim.get("cashless_request")
        and claim.get("hospital") in policy.get("network_hospitals", [])
        and int(claim.get("claim_amount", 0)) <= int(policy.get("cashless_facilities", {}).get("instant_approval_limit", 0))
    )

    next_steps = "Claim adjudicated successfully."
    if decision == "MANUAL_REVIEW":
        next_steps = "Operations team should inspect the flagged claim."
    elif decision == "PARTIAL":
        next_steps = "Review the uncovered items and deductions in the audit trail."

    if uncovered_items:
        notes.extend(item["reason"] for item in uncovered_items if item["reason"])

    return _decision(
        claim_id=claim_id,
        decision=decision,
        approved_amount=approved_amount,
        rejection_reasons=[],
        deductions=deductions,
        flags=flags,
        confidence=round(confidence, 2),
        notes="; ".join(filter(None, notes)),
        next_steps=next_steps,
        audit_trace=audit_trace,
        cashless_approved=cashless_approved,
        line_item_decisions=coverage["line_items"],
    )


def coverage_confidence(category: str) -> float:
    return {
        "alternative_medicine": 0.89,
        "dental": 0.92,
        "diagnostic_tests": 0.94,
        "general": 0.95,
    }.get(category, 0.8)


def _decision(
    *,
    claim_id: str,
    decision: str,
    approved_amount: int,
    rejection_reasons: list[str],
    deductions: dict[str, int],
    flags: list[str],
    confidence: float,
    notes: str,
    next_steps: str,
    audit_trace: list[dict[str, Any]],
    cashless_approved: bool = False,
    line_item_decisions: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    return {
        "claim_id": claim_id,
        "decision": decision,
        "approved_amount": approved_amount,
        "rejection_reasons": rejection_reasons,
        "deductions": deductions,
        "flags": flags,
        "confidence_score": round(confidence, 2),
        "notes": notes,
        "next_steps": next_steps,
        "audit_trace": audit_trace,
        "cashless_approved": cashless_approved,
        "line_item_decisions": line_item_decisions or [],
    }
