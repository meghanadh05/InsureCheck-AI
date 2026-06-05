from ..rules.engine import adjudicate_claim
from .policy_loader import get_policy_terms, get_test_cases


def run_test_cases() -> dict:
    policy = get_policy_terms()
    results = []
    passed = 0

    for case in get_test_cases().get("test_cases", []):
        actual = adjudicate_claim(case["case_id"], case["input_data"], policy)
        expected = case["expected_output"]
        amount_match = expected.get("approved_amount") == actual.get("approved_amount") if "approved_amount" in expected else True
        decision_match = expected["decision"] == actual["decision"]
        reasons_match = expected.get("rejection_reasons", actual.get("rejection_reasons", [])) == actual.get("rejection_reasons", [])
        flags_match = expected.get("flags", actual.get("flags", [])) == actual.get("flags", [])
        cashless_match = expected.get("cashless_approved", actual.get("cashless_approved")) == actual.get("cashless_approved")
        deductions_match = all(
            actual.get("deductions", {}).get(key) == value
            for key, value in expected.get("deductions", {}).items()
        )
        network_discount_match = (
            expected.get("network_discount", actual.get("deductions", {}).get("network_discount"))
            == actual.get("deductions", {}).get("network_discount")
        )
        test_passed = (
            decision_match
            and amount_match
            and reasons_match
            and flags_match
            and cashless_match
            and deductions_match
            and network_discount_match
        )
        passed += int(test_passed)
        mismatches = []
        if not decision_match:
            mismatches.append(f"decision expected {expected['decision']} got {actual['decision']}")
        if not amount_match:
            mismatches.append(f"amount expected {expected.get('approved_amount')} got {actual.get('approved_amount')}")
        if not reasons_match:
            mismatches.append("rejection reasons mismatch")
        if not flags_match:
            mismatches.append("flags mismatch")
        if not cashless_match:
            mismatches.append("cashless approval mismatch")
        if not deductions_match:
            mismatches.append("deductions mismatch")
        if not network_discount_match:
            mismatches.append("network discount mismatch")
        results.append(
            {
                "case_id": case["case_id"],
                "case_name": case["case_name"],
                "expected_decision": expected["decision"],
                "actual_decision": actual["decision"],
                "passed": test_passed,
                "amount_check": amount_match,
                "expected_approved_amount": expected.get("approved_amount"),
                "actual_approved_amount": actual.get("approved_amount"),
                "notes": "; ".join(mismatches) if mismatches else actual.get("notes", ""),
                "confidence_score": actual.get("confidence_score", 0.0),
            }
        )

    return {"summary": {"total": len(results), "passed": passed, "failed": len(results) - passed}, "results": results}
