# API

Base URL: `/api`

- `GET /health`: Service health check.
- `GET /policy`: Returns `policy_terms.json` and the adjudication rules markdown.
- `GET /sample-documents`: Returns fictional sample document text templates derived from the assignment guide.
- `POST /claims`: Creates a claim record from structured input.
- `POST /claims/with-documents`: Creates a claim record and stores uploaded files plus metadata.
- `GET /claims`: Lists all stored claims.
- `GET /claims/{claim_id}`: Fetches one claim and any adjudication result.
- `POST /claims/{claim_id}/adjudicate`: Runs the deterministic engine and persists the result.
- `POST /test-cases/run`: Executes all assignment cases against the production engine.
- `GET /dashboard/summary`: Aggregate dashboard metrics across stored claims.
- `GET /admin/summary`: Compatibility alias for the dashboard summary response.

Primary decision payload:

```json
{
  "claim_id": "CLM_12345678",
  "decision": "APPROVED",
  "approved_amount": 1350,
  "rejection_reasons": [],
  "deductions": {
    "copay": 150
  },
  "flags": [],
  "confidence_score": 0.95,
  "notes": "Reasoning summary",
  "next_steps": "Claim adjudicated successfully.",
  "audit_trace": []
}
```
