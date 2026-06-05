from typing import Any


def evaluate_fraud(claim: dict[str, Any], base_confidence: float) -> dict[str, Any]:
    flags: list[str] = []
    reasons: list[str] = []
    decision_override: str | None = None
    confidence = base_confidence

    if ((claim.get("metadata") or {}).get("duplicate_claim_detected")):
        reasons.append("DUPLICATE_CLAIM")
        confidence = min(confidence, 0.99)

    if int(claim.get("previous_claims_same_day", 0)) >= 3:
        flags.extend(["Multiple claims same day", "Unusual pattern detected"])
        decision_override = "MANUAL_REVIEW"
        confidence = min(confidence, 0.65)

    if int(claim.get("claim_amount", 0)) > 25000:
        flags.append("High-value claim")
        decision_override = "MANUAL_REVIEW"
        confidence = min(confidence, 0.68)

    return {
        "reasons": reasons,
        "flags": flags,
        "decision_override": decision_override,
        "confidence": confidence,
        "trace": [{"stage": "fraud", "rule": "fraud_scan", "result": "pass" if not flags and not reasons else "flagged"}],
    }
