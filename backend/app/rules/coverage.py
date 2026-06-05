from typing import Any


def _line_item(name: str, amount: int, covered: bool, reason: str = "") -> dict[str, Any]:
    return {"item": name, "amount": amount, "covered": covered, "reason": reason}


def _normalize_list(values: list[Any]) -> list[str]:
    return [str(value).strip().lower() for value in values if str(value).strip()]


def evaluate_coverage(claim: dict[str, Any], policy: dict[str, Any]) -> dict[str, Any]:
    coverage = policy.get("coverage_details", {})
    exclusions = [str(item).lower() for item in policy.get("exclusions", [])]
    prescription = ((claim.get("documents") or {}).get("prescription") or {})
    bill = ((claim.get("documents") or {}).get("bill") or {})

    diagnosis = str(prescription.get("diagnosis") or "").lower()
    treatment = str(prescription.get("treatment") or "").lower()
    procedures = _normalize_list(prescription.get("procedures", []) or [])
    medicines = _normalize_list(prescription.get("medicines_prescribed", []) or [])
    tests = _normalize_list(
        (prescription.get("tests_prescribed", []) or [])
        + (bill.get("test_names", []) or [])
    )

    reasons: list[str] = []
    notes: list[str] = []
    trace: list[dict[str, Any]] = []
    line_items: list[dict[str, Any]] = []
    category = "general"

    full_text = " ".join(
        [
            diagnosis,
            treatment,
            " ".join(procedures),
            " ".join(medicines),
            " ".join(tests),
            " ".join(str(key).lower() for key in bill.keys()),
        ]
    )

    if "weight loss treatments" in exclusions and (
        "weight loss" in full_text or "bariatric" in full_text or "obesity" in diagnosis
    ):
        reasons.append("SERVICE_NOT_COVERED")
        notes.append("Weight loss treatments are excluded from coverage")
        trace.append(
            {
                "stage": "coverage",
                "rule": "weight_loss_exclusion",
                "result": "fail",
                "code": "SERVICE_NOT_COVERED",
            }
        )

    if "experimental treatments" in exclusions and "experimental" in full_text:
        reasons.append("EXPERIMENTAL_TREATMENT")
        notes.append("Experimental treatments are excluded from policy coverage")

    if "cosmetic procedures" in exclusions and (
        "cosmetic" in full_text or "whitening" in full_text
    ):
        amount = int(bill.get("teeth_whitening", 0) or bill.get("cosmetic_procedure", 0) or 0)
        if amount or "whitening" in full_text:
            line_items.append(
                _line_item(
                    "Teeth whitening",
                    amount,
                    False,
                    "Teeth whitening - cosmetic procedure",
                )
            )
        category = "dental"

    dental_policy = coverage.get("dental", {})
    dental_procedures = _normalize_list(dental_policy.get("procedures_covered", []) or [])
    if any(item in " ".join(procedures) for item in dental_procedures) or any(
        key in bill for key in ("root_canal", "filling", "extraction", "cleaning")
    ):
        category = "dental"
        if "root canal" in " ".join(procedures) or "root_canal" in bill:
            line_items.append(_line_item("Root canal", int(bill.get("root_canal", 0)), True))

    alternative_policy = coverage.get("alternative_medicine", {})
    covered_treatments = _normalize_list(alternative_policy.get("covered_treatments", []) or [])
    if any(token in full_text for token in covered_treatments) or "panchakarma" in full_text:
        category = "alternative_medicine"
        notes.append("Alternative medicine covered under policy")

    diagnostic_policy = coverage.get("diagnostic_tests", {})
    diagnostic_only_claim = not int(bill.get("consultation_fee", 0) or 0)
    if any("mri" in item or "ct" in item for item in tests) or any(
        key in bill for key in ("mri_scan", "ct_scan")
    ):
        category = "diagnostic_tests"
        high_auth_test = True
        if high_auth_test and int(claim.get("claim_amount", 0)) > 10000 and not claim.get(
            "pre_authorized", False
        ):
            reasons.append("PRE_AUTH_MISSING")
            notes.append("MRI requires pre-authorization for claims above ₹10000")
    elif diagnostic_only_claim and (
        tests or any(key in bill for key in ("ecg", "ultrasound", "diagnostic_tests"))
    ):
        category = "diagnostic_tests"

    if any(token in full_text for token in ("vision", "eye test", "glasses", "contact lenses", "lasik")):
        category = "vision"
        if "lasik" in full_text and not coverage.get("vision", {}).get("lasik_surgery", False):
            reasons.append("SERVICE_NOT_COVERED")
            notes.append("Lasik surgery is not covered under the vision benefit")

    if "vitamins and supplements (unless prescribed for deficiency)" in exclusions:
        if any("vitamin" in item or "supplement" in item for item in medicines) and "deficiency" not in diagnosis:
            notes.append("Vitamins and supplements may require deficiency justification")

    if not line_items:
        for key, value in bill.items():
            if isinstance(value, int):
                line_items.append(_line_item(key.replace("_", " ").title(), value, True))

    trace.append(
        {
            "stage": "coverage",
            "rule": "service_covered",
            "result": "pass" if not reasons else "fail",
        }
    )
    return {
        "passed": not reasons,
        "reasons": sorted(set(reasons)),
        "notes": notes,
        "trace": trace,
        "line_items": line_items,
        "category": category,
    }
