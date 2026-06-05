from datetime import date, timedelta
from typing import Any


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(str(item).strip() for item in value if str(item).strip()).lower()
    return str(value).strip().lower()


def evaluate_eligibility(claim: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    reasons: list[str] = []
    notes: list[str] = []
    trace: list[dict[str, Any]] = []

    treatment_date = parse_date(claim.get("treatment_date"))
    policy_start = parse_date(policy.get("effective_date"))
    if not treatment_date or not policy_start or treatment_date < policy_start:
        reasons.append("POLICY_INACTIVE")
        trace.append({"stage": "eligibility", "rule": "policy_active", "result": "fail"})
        return {"passed": False, "reasons": reasons, "notes": notes, "trace": trace}

    member_id = claim.get("member_id", "")
    if not member_id.startswith("EMP"):
        reasons.append("MEMBER_NOT_COVERED")

    join_date = parse_date(claim.get("member_join_date")) or policy_start
    submission_date = parse_date(claim.get("submission_date"))
    waiting_periods = policy.get("waiting_periods", {})
    claim_requirements = policy.get("claim_requirements", {})
    initial_wait = int(waiting_periods.get("initial_waiting", 0))
    if treatment_date < join_date + timedelta(days=initial_wait):
        reasons.append("WAITING_PERIOD")
        notes.append(f"Initial waiting period ends on {(join_date + timedelta(days=initial_wait)).isoformat()}")

    diagnosis = normalize_text(
        ((claim.get("documents") or {}).get("prescription") or {}).get("diagnosis", "")
    )
    for ailment, days in waiting_periods.get("specific_ailments", {}).items():
        if ailment in diagnosis and treatment_date < join_date + timedelta(days=int(days)):
            eligible_date = join_date + timedelta(days=int(days))
            reasons.append("WAITING_PERIOD")
            notes.append(f"{ailment.title()} has {days}-day waiting period. Eligible from {eligible_date.isoformat()}")
            break

    if submission_date:
        timeline_days = int(claim_requirements.get("submission_timeline_days", 0))
        if submission_date > treatment_date + timedelta(days=timeline_days):
            reasons.append("LATE_SUBMISSION")
            notes.append(f"Claim was submitted after the {timeline_days}-day filing deadline")

    trace.append({"stage": "eligibility", "rule": "policy_active", "result": "pass"})
    trace.append({"stage": "eligibility", "rule": "member_check", "result": "pass" if "MEMBER_NOT_COVERED" not in reasons else "fail"})
    trace.append({"stage": "eligibility", "rule": "waiting_period", "result": "pass" if "WAITING_PERIOD" not in reasons else "fail"})
    trace.append({"stage": "eligibility", "rule": "submission_timeline", "result": "pass" if "LATE_SUBMISSION" not in reasons else "fail"})
    return {"passed": not reasons, "reasons": reasons, "notes": notes, "trace": trace}
