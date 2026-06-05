# Assumptions

- Structured JSON submission is the guaranteed fallback when OCR or LLM extraction is unavailable.
- Uploaded files are stored with metadata even when full OCR is unavailable; plain-text sample files can be used for safe local extraction tests.
- A claim is considered member-covered when the provided `member_id` matches the employee-style `EMP...` format.
- If `member_join_date` is missing, policy effective date is used for waiting period calculations.
- Category-specific sub-limits can override the general per-claim limit for assignment-aligned cases such as dental treatment.
- MRI and CT scans require pre-authorization when claim value exceeds ₹10,000, matching the assignment brief and expected cases.
- Network hospital claims apply a 20% discount and can be marked cashless when below the policy instant approval threshold.
- Medical necessity is heuristic and deterministic in this MVP; ambiguous diagnoses reduce confidence and can be expanded later.
