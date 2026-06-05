import Link from "next/link";

import { ConfidenceMeter } from "../../../components/ConfidenceMeter";
import { EmptyState } from "../../../components/EmptyState";
import { RuleTraceTimeline } from "../../../components/RuleTraceTimeline";
import { StatusBadge } from "../../../components/StatusBadge";
import { getJson } from "../../../lib/api";
import { formatDate, formatMoney } from "../../../lib/format";

type Decision = {
  decision: string;
  approved_amount: number;
  confidence_score: number;
  notes?: string;
  rejection_reasons?: string[];
  deductions?: Record<string, number>;
  flags?: string[];
  audit_trace?: unknown[];
};

type Claim = {
  claim_id: string;
  input_payload: Record<string, unknown>;
  extracted_payload: Record<string, unknown>;
  decision_payload?: (Decision & { audit_trace?: unknown[] }) | null;
};

export default async function ClaimDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: claim, error } = await getJson<Claim | null>(
    `/claims/${id}`,
    null
  );

  if (!claim) {
    return (
      <main className="panel overflow-hidden">
        <EmptyState
          eyebrow="Claim record"
          title="Claim not found"
          description={error ?? `No record exists for claim ID ${id}.`}
          action={{ label: "Back to claims", href: "/claims" }}
        />
      </main>
    );
  }

  const dec = claim.decision_payload;
  const inp = claim.input_payload as {
    member_name?: string;
    treatment_date?: string;
    claim_amount?: number;
    member_id?: string;
  };

  return (
    <main className="space-y-6">
      {error && (
        <div className="rounded-[18px] border border-clay/25 bg-clay/8 px-5 py-3 text-sm text-clay">
          Claim detail is partially degraded. {error}
        </div>
      )}

      {/* Top bar */}
      <div className="panel p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
              Claim record
            </p>
            <h2 className="mt-1 font-display text-3xl">{claim.claim_id}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink/65">
              Review submitted intake, extracted fields, final decision, and
              the full rule trace for this claim.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/claims"
              className="rounded-full border border-ink/15 bg-white/80 px-4 py-2.5 text-sm font-medium text-ink hover:bg-white"
            >
              Back to claims
            </Link>
            <Link
              href="/submit"
              className="rounded-full bg-ink px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Submit another
            </Link>
          </div>
        </div>
      </div>

      {/* Decision summary + input summary */}
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Input summary */}
        <section className="panel p-6">
          <p className="eyebrow">
            Claim details
          </p>
          <div className="mt-4 space-y-3">
            <Row label="Member" value={inp.member_name || "Not provided"} />
            <Row
              label="Member ID"
              value={inp.member_id ? String(inp.member_id) : "Not provided"}
            />
            <Row
              label="Treatment date"
              value={formatDate(String(inp.treatment_date || ""))}
            />
            <Row
              label="Claimed amount"
              value={formatMoney(Number(inp.claim_amount || 0))}
            />
          </div>
          <div className="mt-5">
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium uppercase tracking-[0.15em] text-ink/50 hover:text-ink/70">
                View raw intake payload
              </summary>
              <pre className="mt-3 overflow-x-auto rounded-[18px] bg-white p-4 text-xs text-ink/80">
                {JSON.stringify(claim.input_payload ?? {}, null, 2)}
              </pre>
            </details>
          </div>
        </section>

        {/* Decision card */}
        {dec ? (
          <section className="panel p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">
                  Adjudication decision
                </p>
                <h3 className="mt-2 font-display text-3xl">
                  {dec.decision.replace(/_/g, " ")}
                </h3>
              </div>
              <StatusBadge status={dec.decision} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="soft-panel p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                  Approved amount
                </p>
                <p className="mt-2 font-display text-3xl text-ink">
                  {formatMoney(dec.approved_amount)}
                </p>
              </div>
              <div className="soft-panel p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                  Next step
                </p>
                <p className="mt-2 text-sm leading-relaxed text-ink/68">
                  {dec.decision === "MANUAL_REVIEW"
                    ? "Send to a reviewer with the full trace and supporting documents."
                    : dec.decision === "REJECTED"
                      ? "Review the rejection reasons below before requesting resubmission."
                      : "Claim is ready for downstream processing with traceable policy evidence."}
                </p>
              </div>
            </div>
            <div className="mt-5">
              <ConfidenceMeter score={dec.confidence_score} />
            </div>
            <div className="mt-5 rounded-[22px] border border-plum/8 bg-lavender/35 p-4">
              <p className="eyebrow">Why this decision?</p>
              <p className="mt-2 text-sm leading-relaxed text-ink/70">
                {dec.notes ||
                  "The policy engine combined extracted evidence, submitted claim details, and deterministic rule checks to produce this outcome."}
              </p>
            </div>
            {!!dec.deductions && Object.keys(dec.deductions).length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
                  Deductions
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(dec.deductions).map(([key, val]) => (
                    <span
                      key={key}
                      className="rounded-full bg-sand px-3 py-1 text-sm text-ink"
                    >
                      {key}: {formatMoney(val)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!!dec.flags?.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
                  Risk flags
                </p>
                <div className="flex flex-wrap gap-2">
                  {dec.flags.map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full bg-clay/12 px-3 py-1 text-sm text-clay"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!!dec.rejection_reasons?.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
                  Rejection reasons
                </p>
                <ul className="space-y-1">
                  {dec.rejection_reasons.map((r) => (
                    <li
                      key={r}
                      className="flex items-start gap-2 text-sm text-ink/70"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-clay" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {dec.decision === "MANUAL_REVIEW" && (
              <div className="mt-4 rounded-[22px] border border-plum/10 bg-white/75 p-4">
                <p className="text-sm font-semibold text-plum">
                  Manual review required
                </p>
                <p className="mt-1 text-sm leading-relaxed text-ink/68">
                  Confidence or fraud-related signals prevented a clean automatic
                  decision. Open the audit trace and source payload before
                  releasing funds.
                </p>
              </div>
            )}
          </section>
        ) : (
          <section className="panel flex flex-col items-center justify-center p-10 text-center">
            <div className="rounded-full bg-ink/6 p-4">
              <svg
                className="h-7 w-7 text-ink/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="mt-3 font-display text-lg text-ink">
              Awaiting adjudication
            </p>
            <p className="mt-1.5 text-sm text-ink/55">
              This claim has not been processed through the policy engine yet.
            </p>
          </section>
        )}
      </div>

      {/* Extracted fields + audit trace */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <p className="eyebrow">
            Extracted payload
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Fields parsed from documents or supplied directly via structured
            intake.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[18px] bg-white p-4 text-xs text-ink/80">
            {JSON.stringify(claim.extracted_payload ?? {}, null, 2)}
          </pre>
        </section>
        <section className="panel p-6">
          <p className="eyebrow">
            Audit trace
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Step-by-step rule evaluation log from the adjudication engine.
          </p>
          <div className="mt-5">
            <RuleTraceTimeline trace={dec?.audit_trace ?? []} />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <p className="eyebrow">Documents submitted</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/65">
            The decision above was generated from this submitted intake payload
            and any extracted document fields merged into it.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-[18px] bg-white p-4 text-xs text-ink/80">
            {JSON.stringify((claim.input_payload as { documents?: unknown })?.documents ?? {}, null, 2)}
          </pre>
        </section>
        <section className="panel p-6">
          <p className="eyebrow">Decision handling</p>
          <div className="mt-4 space-y-3">
            {[
              "Review the summary card first for outcome, amount, and confidence.",
              "Open the audit trace when a reviewer needs deterministic evidence.",
              "Use extracted and submitted payloads together when checking document quality or mismatches.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-plum/8 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink/68"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/8 pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-ink/55">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
