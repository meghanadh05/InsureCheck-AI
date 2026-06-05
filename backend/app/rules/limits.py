from typing import Any


def evaluate_limits(claim: dict[str, Any], policy: dict[str, Any], category: str, covered_amount: int) -> dict[str, Any]:
    coverage = policy.get("coverage_details", {})
    requirements = policy.get("claim_requirements", {})
    reasons: list[str] = []
    notes: list[str] = []
    deductions: dict[str, int] = {}
    approved_amount = covered_amount
    trace: list[dict[str, Any]] = []

    minimum_claim = int(requirements.get("minimum_claim_amount", 0))
    if covered_amount < minimum_claim:
        reasons.append("BELOW_MIN_AMOUNT")

    annual_limit = int(coverage.get("annual_limit", 0) or 0)
    member_approved_ytd = int(((claim.get("metadata") or {}).get("member_approved_amount_ytd")) or 0)
    if annual_limit and member_approved_ytd >= annual_limit:
        reasons.append("ANNUAL_LIMIT_EXCEEDED")
        notes.append(f"Member has already exhausted the annual OPD limit of ₹{annual_limit}")
    elif annual_limit and member_approved_ytd + covered_amount > annual_limit:
        annual_remaining = max(0, annual_limit - member_approved_ytd)
        deductions["annual_limit_delta"] = covered_amount - annual_remaining
        approved_amount = min(approved_amount, annual_remaining)
        notes.append(f"Approved up to remaining annual limit of ₹{annual_remaining}")

    family_limit = int(coverage.get("family_floater_limit", 0) or 0)
    family_approved_ytd = int(((claim.get("metadata") or {}).get("family_approved_amount_ytd")) or 0)
    if family_limit and family_approved_ytd >= family_limit:
        reasons.append("ANNUAL_LIMIT_EXCEEDED")
        notes.append(f"Family floater limit of ₹{family_limit} has been exhausted")
    elif family_limit and family_approved_ytd + approved_amount > family_limit:
        family_remaining = max(0, family_limit - family_approved_ytd)
        deductions["family_floater_delta"] = max(0, approved_amount - family_remaining)
        approved_amount = min(approved_amount, family_remaining)
        notes.append(f"Approved up to remaining family floater limit of ₹{family_remaining}")

    if category == "general" and covered_amount > int(coverage.get("per_claim_limit", 0)):
        reasons.append("PER_CLAIM_EXCEEDED")
        notes.append(f"Claim amount exceeds per-claim limit of ₹{coverage.get('per_claim_limit', 0)}")

    category_key = category
    if category == "general":
        category_key = "consultation_fees"
    category_policy = coverage.get(category_key, {})
    sub_limit = int(category_policy.get("sub_limit", coverage.get("per_claim_limit", 0) or 0))
    if category != "general" and covered_amount > sub_limit:
        approved_amount = sub_limit
        deductions["sub_limit_delta"] = covered_amount - sub_limit
        notes.append("SUB_LIMIT_EXCEEDED")
        notes.append(f"Approved up to {category} sub-limit of ₹{sub_limit}")

    consultation_fee = int(((claim.get("documents") or {}).get("bill") or {}).get("consultation_fee", 0))
    if category == "general" and consultation_fee > 0 and not claim.get("hospital"):
        copay = round(int(claim.get("claim_amount", 0)) * int(coverage.get("consultation_fees", {}).get("copay_percentage", 0)) / 100)
        deductions["copay"] = copay
        approved_amount = max(0, approved_amount - copay)

    if category == "pharmacy":
        branded_copay = int(coverage.get("pharmacy", {}).get("branded_drugs_copay", 0) or 0)
        if branded_copay:
            copay = round(approved_amount * branded_copay / 100)
            deductions["pharmacy_copay"] = copay
            approved_amount = max(0, approved_amount - copay)

    hospital = claim.get("hospital")
    if hospital and hospital in policy.get("network_hospitals", []):
        discount_pct = int(coverage.get("consultation_fees", {}).get("network_discount", 0))
        network_discount = round(int(claim.get("claim_amount", 0)) * discount_pct / 100)
        deductions["network_discount"] = network_discount
        approved_amount = max(0, approved_amount - network_discount)

    trace.append(
        {
            "stage": "limits",
            "rule": "limit_check",
            "result": "pass" if not reasons else "fail",
            "category": category,
        }
    )
    return {
        "passed": not reasons,
        "reasons": reasons,
        "notes": notes,
        "trace": trace,
        "approved_amount": approved_amount,
        "deductions": deductions,
    }
