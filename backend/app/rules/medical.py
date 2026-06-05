from typing import Any


MEDICAL_MATCHES = {
    "viral fever": ["paracetamol", "cbc", "dengue"],
    "gastroenteritis": ["antibiotics", "probiotics"],
    "migraine": ["sumatriptan", "propranolol"],
    "acute bronchitis": ["antibiotics", "bronchodilators"],
    "type 2 diabetes": ["metformin", "glimepiride"],
    "tooth decay": ["root canal"],
    "lumbar disc herniation": ["mri"],
}


def normalize_text(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, list):
        return " ".join(str(item).strip() for item in value if str(item).strip()).lower()
    return str(value).strip().lower()


def evaluate_medical_necessity(claim: dict[str, Any]) -> dict[str, Any]:
    prescription = ((claim.get("documents") or {}).get("prescription") or {})
    diagnosis = normalize_text(prescription.get("diagnosis"))
    tokens = " ".join(
        normalize_text(item)
        for item in [
            *(prescription.get("medicines_prescribed", []) or []),
            *(prescription.get("tests_prescribed", []) or []),
            *(prescription.get("procedures", []) or []),
            prescription.get("treatment") or "",
        ]
    )

    confidence = 0.95
    for key, expected_tokens in MEDICAL_MATCHES.items():
        if key in diagnosis:
            if not any(token in tokens for token in expected_tokens):
                return {
                    "passed": False,
                    "reasons": ["NOT_MEDICALLY_NECESSARY"],
                    "trace": [{"stage": "medical", "rule": "diagnosis_match", "result": "fail"}],
                    "confidence": 0.62,
                }
            break
    else:
        confidence = 0.89 if normalize_text(prescription.get("treatment")) else 0.78

    return {
        "passed": True,
        "reasons": [],
        "trace": [{"stage": "medical", "rule": "diagnosis_match", "result": "pass"}],
        "confidence": confidence,
    }
