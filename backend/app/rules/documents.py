from typing import Any

from ..services.document_service import detect_document_issues


def evaluate_documents(claim: dict[str, Any]) -> dict[str, Any]:
    issues = detect_document_issues(claim.get("documents", {}), claim.get("member_name", ""))
    trace = [{"stage": "documents", "rule": issue.lower(), "result": "fail"} for issue in issues]
    if not issues:
        trace.append({"stage": "documents", "rule": "required_documents", "result": "pass"})
    return {"passed": not issues, "reasons": issues, "trace": trace}
