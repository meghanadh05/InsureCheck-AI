# Architecture

InsureCheck AI is split into two apps:

- `backend/`: FastAPI service with SQLite persistence, uploaded-file metadata storage, AI/fallback extraction, and a deterministic adjudication engine.
- `frontend/`: Next.js App Router console for claim intake, queue review, regression testing, and admin reporting.

Core backend flow:

1. `POST /api/claims` stores structured claim data.
2. `POST /api/claims/with-documents` stores uploaded prescription, bill, diagnostic report, and pharmacy bill metadata under `backend/uploads/`.
3. `POST /api/claims/{claim_id}/adjudicate` runs the production rule engine.
4. The engine evaluates eligibility, documents, coverage, limits, medical necessity, then fraud/manual review.
5. The final decision payload stores approved amount, deductions, flags, and a full audit trace.

Design principles:

- Deterministic decisions from policy data, never direct LLM freeform approval.
- AI only assists extraction and confidence support; final decisions always come from deterministic policy rules.
- Shared adjudication engine powers both live claims and the test-case runner.
- Manual fallback remains available through structured claim JSON intake.
