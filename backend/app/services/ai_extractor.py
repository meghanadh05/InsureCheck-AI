import json
from typing import Any

import httpx

from ..config import get_settings


def _normalize_text_field(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        text = " ".join(str(item).strip() for item in value if str(item).strip()).strip()
        return text or None
    text = str(value).strip()
    return text or None


def _normalize_list_field(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    text = str(value).strip()
    return [text] if text else []


def _mock_extract(claim_input: dict[str, Any], reason: str | None = None) -> dict[str, Any]:
    documents = claim_input.get("documents", {})
    prescription = documents.get("prescription", {})
    bill = documents.get("bill", {})
    payload = {
        "diagnosis": _normalize_text_field(prescription.get("diagnosis")),
        "doctor_name": _normalize_text_field(prescription.get("doctor_name")),
        "doctor_reg": _normalize_text_field(prescription.get("doctor_reg")),
        "medicines_prescribed": _normalize_list_field(prescription.get("medicines_prescribed", [])),
        "tests_prescribed": _normalize_list_field(prescription.get("tests_prescribed", [])),
        "procedures": _normalize_list_field(prescription.get("procedures", [])),
        "treatment": _normalize_text_field(prescription.get("treatment")),
        "bill_summary": bill,
        "extraction_mode": "mock-fallback",
        "confidence": 0.86 if documents else 0.4,
    }
    if reason:
        payload["fallback_reason"] = reason
    return payload


def merge_extracted_into_claim(claim_input: dict[str, Any], extracted: dict[str, Any]) -> dict[str, Any]:
    merged = dict(claim_input)
    documents = dict(claim_input.get("documents", {}) or {})
    prescription = dict(documents.get("prescription", {}) or {})
    bill = dict(documents.get("bill", {}) or {})
    extracted_bill = dict(extracted.get("bill_summary", {}) or {})

    if extracted.get("doctor_name") and not prescription.get("doctor_name"):
        prescription["doctor_name"] = _normalize_text_field(extracted["doctor_name"])
    if extracted.get("doctor_reg") and not prescription.get("doctor_reg"):
        prescription["doctor_reg"] = _normalize_text_field(extracted["doctor_reg"])
    if extracted.get("diagnosis") and not prescription.get("diagnosis"):
        prescription["diagnosis"] = _normalize_text_field(extracted["diagnosis"])
    if extracted.get("medicines_prescribed") and not prescription.get("medicines_prescribed"):
        prescription["medicines_prescribed"] = _normalize_list_field(extracted["medicines_prescribed"])
    if extracted.get("tests_prescribed") and not prescription.get("tests_prescribed"):
        prescription["tests_prescribed"] = _normalize_list_field(extracted["tests_prescribed"])
    if extracted.get("procedures") and not prescription.get("procedures"):
        prescription["procedures"] = _normalize_list_field(extracted["procedures"])
    if extracted.get("treatment") and not prescription.get("treatment"):
        prescription["treatment"] = _normalize_text_field(extracted["treatment"])

    for key, value in extracted_bill.items():
        bill.setdefault(key, value)

    if prescription:
        documents["prescription"] = prescription
    if bill:
        documents["bill"] = bill

    merged["documents"] = documents
    merged.setdefault("metadata", {})
    merged["metadata"]["ai_extraction"] = {
        "mode": extracted.get("extraction_mode", "mock-fallback"),
        "confidence": extracted.get("confidence", 0.0),
    }
    return merged


class AIExtractor:
    def extract(self, claim_input: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        metadata = claim_input.get("metadata", {}) or {}
        document_text = (
            metadata.get("document_text")
            or metadata.get("ocr_text")
            or ((claim_input.get("documents", {}) or {}).get("raw_text"))
        )
        provider = settings.effective_ai_provider

        if provider == "fallback":
            reason = "No AI API key configured"
            if not document_text:
                reason = "No OCR or raw document text provided"
            return _mock_extract(claim_input, reason)

        if not document_text:
            return _mock_extract(claim_input, "No OCR or raw document text provided")

        if provider == "groq":
            try:
                return self._extract_with_groq(document_text)
            except Exception as exc:
                return _mock_extract(claim_input, f"Groq extraction failed: {exc}")

        try:
            return self._extract_with_openai(document_text)
        except Exception as exc:
            return _mock_extract(claim_input, f"OpenAI extraction failed: {exc}")

    def _extract_with_groq(self, document_text: str) -> dict[str, Any]:
        settings = get_settings()
        prompt = (
            "Extract structured OPD claim data from the document text. "
            "Return only valid JSON with keys: diagnosis, doctor_name, doctor_reg, medicines_prescribed, "
            "tests_prescribed, procedures, treatment, bill_summary, confidence. "
            "Use arrays for list fields, integers for bill amounts, and omit unknown values with null or empty arrays.\n\n"
            f"Document text:\n{document_text}"
        )
        response = httpx.post(
            f"{settings.groq_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.cleaned_groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.groq_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=20.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        extracted = json.loads(content)
        extracted["diagnosis"] = _normalize_text_field(extracted.get("diagnosis"))
        extracted["doctor_name"] = _normalize_text_field(extracted.get("doctor_name"))
        extracted["doctor_reg"] = _normalize_text_field(extracted.get("doctor_reg"))
        extracted["treatment"] = _normalize_text_field(extracted.get("treatment"))
        extracted["extraction_mode"] = f"groq:{settings.groq_model}"
        extracted["confidence"] = float(extracted.get("confidence", 0.82))
        extracted.setdefault("bill_summary", {})
        extracted["medicines_prescribed"] = _normalize_list_field(extracted.get("medicines_prescribed", []))
        extracted["tests_prescribed"] = _normalize_list_field(extracted.get("tests_prescribed", []))
        extracted["procedures"] = _normalize_list_field(extracted.get("procedures", []))
        return extracted

    def _extract_with_openai(self, document_text: str) -> dict[str, Any]:
        settings = get_settings()
        prompt = (
            "Extract structured OPD claim data from the document text. "
            "Return only valid JSON with keys: diagnosis, doctor_name, doctor_reg, medicines_prescribed, "
            "tests_prescribed, procedures, treatment, bill_summary, confidence. "
            "Use arrays for list fields, integers for bill amounts, and omit unknown values with null or empty arrays.\n\n"
            f"Document text:\n{document_text}"
        )
        response = httpx.post(
            f"{settings.openai_base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.cleaned_openai_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.openai_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0,
                "response_format": {"type": "json_object"},
            },
            timeout=20.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        extracted = json.loads(content)
        extracted["diagnosis"] = _normalize_text_field(extracted.get("diagnosis"))
        extracted["doctor_name"] = _normalize_text_field(extracted.get("doctor_name"))
        extracted["doctor_reg"] = _normalize_text_field(extracted.get("doctor_reg"))
        extracted["treatment"] = _normalize_text_field(extracted.get("treatment"))
        extracted["extraction_mode"] = f"openai:{settings.openai_model}"
        extracted["confidence"] = float(extracted.get("confidence", 0.82))
        extracted.setdefault("bill_summary", {})
        extracted["medicines_prescribed"] = _normalize_list_field(extracted.get("medicines_prescribed", []))
        extracted["tests_prescribed"] = _normalize_list_field(extracted.get("tests_prescribed", []))
        extracted["procedures"] = _normalize_list_field(extracted.get("procedures", []))
        return extracted


extractor = AIExtractor()
