# Decision Flow

The adjudication engine processes claims in this order:

1. Eligibility
   Confirms policy activity, member identity pattern, initial waiting period, and specific ailment waiting periods.
2. Documents
   Requires bill and prescription, validates doctor registration format, checks prescription completeness, and checks patient/date mismatches when present.
3. Coverage
   Maps services into categories, rejects exclusions, supports dental partial approval, and enforces MRI/CT pre-auth logic.
4. Limits
   Applies minimum amount, general per-claim limit, category sub-limits, consultation co-pay, and network discount.
5. Medical necessity
   Uses deterministic diagnosis-treatment token matching to reject clinically inconsistent claims.
6. Fraud review
   Escalates multiple same-day claims and high-value claims to manual review.

The final response always includes audit steps, monetary deductions, and next actions.
