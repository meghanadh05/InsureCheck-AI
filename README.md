# InsureCheck AI

InsureCheck AI is a Docker-first OPD claim adjudication MVP built to satisfy Plum's AI Automation Engineer intern assignment.

## Quick Start

```bash
chmod +x setup.sh stop.sh
./setup.sh --all --clean --build
```

Open:

- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/api/health

## Deployed App

- Web app: `<add deployed frontend link>`
- API: `<add deployed backend link>`
- GitHub repo: `<add repository link>`
- Demo video: `<add demo video link>`

## What Works Without API Keys

- No `GROQ_API_KEY` or `OPENAI_API_KEY` is required for local evaluation
- If keys are missing, the backend uses the fallback extractor automatically
- Claim intake, document upload, adjudication, dashboard views, and test-case runner still work

## Optional AI Keys

Add either key to `.env` in the project root:

```bash
GROQ_API_KEY=
OPENAI_API_KEY=
```

Extractor selection:

- `GROQ_API_KEY` present -> `groq`
- else `OPENAI_API_KEY` present -> `openai`
- else -> `fallback`

Check the active extractor at:

- http://localhost:8000/api/health

## Features

- Structured OPD claim intake
- Upload support for:
  - prescription
  - medical bill
  - diagnostic report
  - pharmacy bill
- Uploaded file persistence and metadata storage
- AI-assisted structured extraction with deterministic fallback
- Policy-driven rule engine using:
  - `policy_terms.json`
  - `test_cases.json`
  - `adjudication_rules.md`
- Decision outcomes:
  - `APPROVED`
  - `REJECTED`
  - `PARTIAL`
  - `MANUAL_REVIEW`
- Claim detail page with audit trace and reasoning
- Regression runner for all 10 provided Plum test cases
- Dashboard with portfolio summaries

## Decision Engine

The backend follows the assignment decision flow in this order:

1. Basic eligibility check
2. Document validation
3. Coverage verification
4. Limit validation
5. Medical necessity review
6. Fraud / manual review checks

Every decision includes:

- `claim_id`
- `decision`
- `approved_amount`
- `rejection_reasons`
- `confidence_score`
- `notes`
- `next_steps`
- `deductions`
- `flags`
- `audit_trace`

## Test Case Runner

Run all provided assignment cases through the production adjudication engine:

- UI: http://localhost:3000/test-cases
- API: `POST /api/test-cases/run`

The page shows:

- total
- passed
- failed
- pass rate
- expected vs actual decision
- amount comparison
- confidence score
- notes

## Sample Documents

Because the assignment provides document format guidelines instead of real medical files, fictional sample documents/templates are included for safe testing.

Available sources:

- Frontend page: `http://localhost:3000/sample-documents`
- Backend sample template endpoint: `GET /api/sample-documents`
- Guide copied into app data: `backend/app/data/sample_documents_guide.md`
- Docs copy: `docs/sample-documents/sample_documents_guide.md`

Included fictional templates:

- Prescription
- Medical bill
- Diagnostic report
- Pharmacy bill

Plain-text fictional samples can be uploaded from the submit page for safe local testing without a full OCR pipeline.

## Useful Commands

Start everything:

```bash
./setup.sh --all
```

Restart fresh:

```bash
./setup.sh --all --clean --build
```

Stop services:

```bash
./stop.sh
```

Full cleanup:

```bash
./stop.sh --clean
```

Backend logs:

```bash
docker compose logs -f backend
```

Frontend logs:

```bash
docker compose logs -f frontend
```

## API Endpoints

- `GET /api/health`
- `GET /api/policy`
- `GET /api/sample-documents`
- `POST /api/claims`
- `POST /api/claims/with-documents`
- `GET /api/claims`
- `GET /api/claims/{claim_id}`
- `POST /api/claims/{claim_id}/adjudicate`
- `POST /api/test-cases/run`
- `GET /api/dashboard/summary`
- `GET /api/admin/summary` (compatibility alias)

## Project Structure

```text
backend/
  app/
    data/
    rules/
    services/
  uploads/
frontend/
docs/
  sample-documents/
setup.sh
stop.sh
docker-compose.yml
```

## Assignment Context

This project maps directly to the provided Plum assignment package:

- `policy_terms.json` is loaded as the source of truth for limits, coverage, exclusions, waiting periods, and network rules
- `test_cases.json` powers the backend regression runner
- `adjudication_rules.md` is reflected in the engine order and documentation
- `sample_documents_guide.md` is included for fictional safe testing support

## Troubleshooting

If an AI key is not detected:

- Make sure `.env` is in the project root, next to `docker-compose.yml`
- Make sure the variable name is exactly `GROQ_API_KEY` or `OPENAI_API_KEY`
- Run `docker compose down`
- Run `./setup.sh --all --clean --build`
- Check `http://localhost:8000/api/health`
- Check `docker compose logs -f backend`

## Future Improvements

- Real OCR for PDF/image uploads
- Stronger illegibility detection
- Authentication for production deployment
- Member portal and self-service claim tracking
- Reviewer roles and workflow routing
- Admin roles and permissions for production operations
- Richer dashboard analytics
- More configurable policy/rule authoring
 
