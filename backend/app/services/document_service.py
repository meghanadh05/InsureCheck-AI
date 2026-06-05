import io
import mimetypes
import re
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from uuid import uuid4

import pytesseract
from fastapi import UploadFile
from pdf2image import convert_from_bytes
from PIL import Image
from pypdf import PdfReader

from ..config import get_settings


STD_REG_PATTERN = re.compile(r"^[A-Z]{2}/\d{4,6}/\d{4}$")
AYUSH_REG_PATTERN = re.compile(r"^[A-Z]+/[A-Z]{2}/\d{3,6}/\d{4}$")


def normalize_documents(documents: dict[str, Any]) -> dict[str, Any]:
    return documents or {}


def doctor_registration_valid(registration_number: str | None) -> bool:
    if not registration_number:
        return False
    value = registration_number.strip().upper()
    return bool(STD_REG_PATTERN.match(value) or AYUSH_REG_PATTERN.match(value))


def detect_document_issues(documents: dict[str, Any], member_name: str) -> list[str]:
    issues: list[str] = []
    prescription = documents.get("prescription")
    bill = documents.get("bill")
    uploaded_files = documents.get("uploaded_files") or []

    if not prescription or not bill:
        issues.append("MISSING_DOCUMENTS")
        return issues

    if not prescription.get("doctor_name") or not prescription.get("diagnosis"):
        issues.append("INVALID_PRESCRIPTION")

    if not doctor_registration_valid(prescription.get("doctor_reg")):
        issues.append("DOCTOR_REG_INVALID")

    patient_name = prescription.get("patient_name") or bill.get("patient_name")
    if patient_name and patient_name.strip().lower() != member_name.strip().lower():
        issues.append("PATIENT_MISMATCH")

    document_dates = {
        value
        for value in [prescription.get("date"), bill.get("date")]
        if isinstance(value, str) and value.strip()
    }
    if len(document_dates) > 1:
        issues.append("DATE_MISMATCH")

    if uploaded_files and any(int(file.get("size_bytes", 0)) == 0 for file in uploaded_files):
        issues.append("ILLEGIBLE_DOCUMENTS")

    return issues


def ensure_upload_dir(claim_id: str) -> Path:
    settings = get_settings()
    upload_dir = settings.resolved_upload_dir / claim_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def extract_claim_fields_from_text(document_text: str) -> dict[str, Any]:
    from .ai_extractor import extractor

    return extractor.extract(
        {
            "documents": {},
            "metadata": {"document_text": document_text},
        }
    )


def _extract_text_from_pdf(content: bytes) -> str:
    text_fragments: list[str] = []
    try:
        reader = PdfReader(io.BytesIO(content))
        for page in reader.pages:
            extracted = (page.extract_text() or "").strip()
            if extracted:
                text_fragments.append(extracted)
    except Exception:
        text_fragments = []

    if text_fragments:
        return "\n\n".join(text_fragments).strip()

    try:
        images = convert_from_bytes(content)
        ocr_fragments = []
        for image in images:
            extracted = pytesseract.image_to_string(image).strip()
            if extracted:
                ocr_fragments.append(extracted)
        return "\n\n".join(ocr_fragments).strip()
    except Exception:
        return ""


def _extract_text_from_image(content: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(content))
        return pytesseract.image_to_string(image).strip()
    except Exception:
        return ""


def extract_document_text(content: bytes, content_type: str | None, suffix: str) -> tuple[str, str]:
    kind = "none"
    text_preview = ""
    normalized_suffix = suffix.lower()

    if (content_type or "").startswith("text/") or normalized_suffix == ".txt":
        kind = "text"
        try:
            text_preview = content.decode("utf-8").strip()
        except UnicodeDecodeError:
            text_preview = content.decode("latin-1", errors="ignore").strip()
        return text_preview, kind

    if normalized_suffix == ".pdf" or content_type == "application/pdf":
        kind = "pdf_ocr"
        return _extract_text_from_pdf(content), kind

    if normalized_suffix in {".png", ".jpg", ".jpeg", ".bmp", ".tiff", ".webp"} or (
        content_type or ""
    ).startswith("image/"):
        kind = "image_ocr"
        return _extract_text_from_image(content), kind

    return text_preview, kind


async def persist_uploaded_documents(
    claim_id: str,
    uploads: dict[str, UploadFile | None],
) -> dict[str, Any]:
    upload_dir = ensure_upload_dir(claim_id)
    saved_files: list[dict[str, Any]] = []
    extracted_text_fragments: list[str] = []

    for document_type, upload in uploads.items():
        if upload is None or not upload.filename:
            continue

        suffix = Path(upload.filename).suffix or mimetypes.guess_extension(upload.content_type or "") or ""
        safe_name = f"{document_type}_{uuid4().hex[:8]}{suffix}"
        destination = upload_dir / safe_name
        content = await upload.read()
        destination.write_bytes(content)

        text_preview, extraction_method = extract_document_text(content, upload.content_type, suffix)

        if text_preview:
            extracted_text_fragments.append(
                f"{document_type.replace('_', ' ').title()}:\n{text_preview}"
            )

        saved_files.append(
            {
                "document_type": document_type,
                "original_name": upload.filename,
                "stored_name": safe_name,
                "content_type": upload.content_type or "application/octet-stream",
                "size_bytes": len(content),
                "storage_path": str(destination),
                "text_preview": text_preview[:4000],
                "text_extraction_method": extraction_method,
                "text_extracted": bool(text_preview),
            }
        )
        await upload.close()

    return {
        "files": saved_files,
        "combined_text": "\n\n".join(fragment for fragment in extracted_text_fragments if fragment).strip(),
    }


async def extract_uploaded_documents(
    uploads: dict[str, UploadFile | None],
) -> dict[str, Any]:
    with TemporaryDirectory(prefix="insurecheck_extract_") as temp_dir:
        saved_files: list[dict[str, Any]] = []
        extracted_text_fragments: list[str] = []

        for document_type, upload in uploads.items():
            if upload is None or not upload.filename:
                continue

            suffix = Path(upload.filename).suffix or mimetypes.guess_extension(upload.content_type or "") or ""
            safe_name = f"{document_type}_{uuid4().hex[:8]}{suffix}"
            destination = Path(temp_dir) / safe_name
            content = await upload.read()
            destination.write_bytes(content)

            text_preview, extraction_method = extract_document_text(
                content,
                upload.content_type,
                suffix,
            )
            if text_preview:
                extracted_text_fragments.append(
                    f"{document_type.replace('_', ' ').title()}:\n{text_preview}"
                )

            saved_files.append(
                {
                    "document_type": document_type,
                    "original_name": upload.filename,
                    "stored_name": safe_name,
                    "content_type": upload.content_type or "application/octet-stream",
                    "size_bytes": len(content),
                    "storage_path": str(destination),
                    "text_preview": text_preview[:4000],
                    "text_extraction_method": extraction_method,
                    "text_extracted": bool(text_preview),
                }
            )
            await upload.close()

        combined_text = "\n\n".join(
            fragment for fragment in extracted_text_fragments if fragment
        ).strip()
        extracted_fields = (
            extract_claim_fields_from_text(combined_text) if combined_text else {}
        )
        return {
            "files": saved_files,
            "combined_text": combined_text,
            "extracted_fields": extracted_fields,
        }
