import json
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi import File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from .config import get_settings
from .database import Base, engine, ensure_schema, get_db
from .models import ClaimRecord
from .schemas import AdminSummary, ClaimCreate, ClaimResponse
from .services.adjudication_service import adjudicate_record, create_claim, refresh_extraction
from .services.document_service import extract_uploaded_documents, persist_uploaded_documents
from .services.policy_loader import (
    get_adjudication_rules,
    get_policy_terms,
    get_sample_document_templates,
)
from .services.sample_document_service import (
    generate_sample_document,
    get_sample_document,
    get_download_payload,
    list_sample_documents,
    sample_document_path,
)
from .services.test_case_runner import run_test_cases


settings = get_settings()
app = FastAPI(title=settings.app_name)
_allowed_origins = [
    o.strip()
    for o in settings.frontend_origin.split(",")
    if o.strip()
] + ["http://127.0.0.1:3000"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
Base.metadata.create_all(bind=engine)
ensure_schema()


@app.get(f"{settings.api_prefix}/health")
def health():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    policy_loaded = bool(get_policy_terms())

    return {
        "status": "ok",
        "service": settings.app_name,
        "database": "sqlite" if settings.database_url.startswith("sqlite") else "external",
        "ai_extractor": settings.effective_ai_provider,
        "policy_loaded": policy_loaded,
        "ai_key_configured": settings.ai_key_configured,
    }


@app.get(f"{settings.api_prefix}/policy")
def policy():
    return {"policy": get_policy_terms(), "rules_markdown": get_adjudication_rules()}


@app.get(f"{settings.api_prefix}/sample-documents")
def sample_documents():
    return {
        "available_documents": list_sample_documents(),
        "templates": get_sample_document_templates(),
    }


@app.get(f"{settings.api_prefix}/sample-documents/{{document_type}}")
def sample_document(document_type: str):
    try:
        return get_sample_document(document_type)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown sample document type") from exc


@app.get(f"{settings.api_prefix}/sample-documents/{{document_type}}/download")
def sample_document_download(
    document_type: str,
    case_type: str | None = Query(default=None),
    format: str = Query(default="txt"),
):
    try:
        if case_type or format == "pdf":
            filename, content, media_type = get_download_payload(
                document_type,
                case_type=case_type,
                output_format=format,
            )
            return Response(
                content=content,
                media_type=media_type,
                headers={"Content-Disposition": f'attachment; filename="{filename}"'},
            )
        path = sample_document_path(document_type)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Unknown sample document type") from exc
    return FileResponse(path, filename=path.name, media_type="text/plain")


@app.post(f"{settings.api_prefix}/sample-documents/generate")
def sample_document_generate(payload: dict[str, str]):
    document_type = payload.get("document_type", "")
    case_type = payload.get("case_type", "")
    try:
        return generate_sample_document(document_type, case_type)
    except KeyError as exc:
        raise HTTPException(status_code=400, detail="Unsupported document_type or case_type") from exc


@app.post(f"{settings.api_prefix}/claims", response_model=ClaimResponse)
def submit_claim(payload: ClaimCreate, db: Session = Depends(get_db)):
    return create_claim(db, payload.model_dump())


@app.post(f"{settings.api_prefix}/documents/extract")
async def extract_documents(
    prescription: UploadFile | None = File(default=None),
    medical_bill: UploadFile | None = File(default=None),
    diagnostic_report: UploadFile | None = File(default=None),
    pharmacy_bill: UploadFile | None = File(default=None),
):
    uploaded = await extract_uploaded_documents(
        {
            "prescription": prescription,
            "medical_bill": medical_bill,
            "diagnostic_report": diagnostic_report,
            "pharmacy_bill": pharmacy_bill,
        }
    )
    return uploaded


@app.post(f"{settings.api_prefix}/claims/with-documents", response_model=ClaimResponse)
async def submit_claim_with_documents(
    payload: str = Form(...),
    prescription: UploadFile | None = File(default=None),
    medical_bill: UploadFile | None = File(default=None),
    diagnostic_report: UploadFile | None = File(default=None),
    pharmacy_bill: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
):
    try:
        parsed_payload = ClaimCreate.model_validate(json.loads(payload)).model_dump()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid claim payload: {exc}") from exc

    claim = create_claim(db, parsed_payload)
    uploaded = await persist_uploaded_documents(
        claim.claim_id,
        {
            "prescription": prescription,
            "medical_bill": medical_bill,
            "diagnostic_report": diagnostic_report,
            "pharmacy_bill": pharmacy_bill,
        },
    )
    if uploaded["files"]:
        updated_payload = dict(claim.input_payload or {})
        metadata = dict(updated_payload.get("metadata") or {})
        documents = dict(updated_payload.get("documents") or {})

        metadata["uploaded_files"] = uploaded["files"]
        if uploaded["combined_text"] and not metadata.get("document_text"):
            metadata["document_text"] = uploaded["combined_text"]

        documents["uploaded_files"] = uploaded["files"]
        updated_payload["metadata"] = metadata
        updated_payload["documents"] = documents
        claim.input_payload = updated_payload

        db.add(claim)
        db.commit()
        db.refresh(claim)
        claim = refresh_extraction(db, claim)
    return claim


@app.get(f"{settings.api_prefix}/claims", response_model=list[ClaimResponse])
def list_claims(db: Session = Depends(get_db)):
    return db.query(ClaimRecord).order_by(ClaimRecord.created_at.desc()).all()


@app.get(f"{settings.api_prefix}/claims/{{claim_id}}", response_model=ClaimResponse)
def get_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(ClaimRecord).filter(ClaimRecord.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return claim


@app.post(f"{settings.api_prefix}/claims/{{claim_id}}/adjudicate", response_model=ClaimResponse)
def adjudicate(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(ClaimRecord).filter(ClaimRecord.claim_id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    return adjudicate_record(db, claim)


@app.post(f"{settings.api_prefix}/test-cases/run")
def run_cases():
    return run_test_cases()


def build_dashboard_summary(db: Session):
    claims = db.query(ClaimRecord).all()
    decisions = [claim.decision_payload or {} for claim in claims if claim.decision_payload]
    return {
        "total_claims": len(claims),
        "approved": sum(1 for item in decisions if item.get("decision") == "APPROVED"),
        "rejected": sum(1 for item in decisions if item.get("decision") == "REJECTED"),
        "partial": sum(1 for item in decisions if item.get("decision") == "PARTIAL"),
        "manual_review": sum(1 for item in decisions if item.get("decision") == "MANUAL_REVIEW"),
        "total_claimed_amount": sum(claim.claim_amount for claim in claims),
        "total_approved_amount": sum(item.get("approved_amount", 0) for item in decisions),
        "average_confidence": round(sum(item.get("confidence_score", 0) for item in decisions) / max(len(decisions), 1), 2),
        "recent_flags": [flag for item in decisions[-5:] for flag in item.get("flags", [])],
        "ai_provider": settings.effective_ai_provider,
    }


@app.get(f"{settings.api_prefix}/admin/summary", response_model=AdminSummary)
def admin_summary(db: Session = Depends(get_db)):
    return build_dashboard_summary(db)


@app.get(f"{settings.api_prefix}/dashboard/summary", response_model=AdminSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    return build_dashboard_summary(db)
