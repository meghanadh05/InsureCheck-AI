import { getJson } from "../../lib/api";
import { EmptyState } from "../../components/EmptyState";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { formatMoney, formatConfidence } from "../../lib/format";

type Summary = {
  total_claims: number;
  approved: number;
  rejected: number;
  partial: number;
  manual_review: number;
  total_claimed_amount: number;
  total_approved_amount: number;
  average_confidence: number;
  recent_flags: string[];
  ai_provider: string;
};

export default async function AdminPage() {
  const { data: summary, error } = await getJson<Summary>("/dashboard/summary", {
    total_claims: 0,
    approved: 0,
    rejected: 0,
    partial: 0,
    manual_review: 0,
    total_claimed_amount: 0,
    total_approved_amount: 0,
    average_confidence: 0,
    recent_flags: [],
    ai_provider: "unavailable",
  });

  const decisionCards = [
    {
      label: "Total claims",
      value: String(summary.total_claims),
      hint: "Claims currently on record",
      accent: "bg-white/85",
    },
    {
      label: "Approved",
      value: String(summary.approved),
      hint: "Cleared by policy engine",
      accent: "bg-pine/8",
    },
    {
      label: "Rejected",
      value: String(summary.rejected),
      hint: "Hard policy or document failures",
      accent: "bg-clay/10",
    },
    {
      label: "Partial",
      value: String(summary.partial),
      hint: "Approved with deductible impact",
      accent: "bg-sand/90",
    },
    {
      label: "Manual review",
      value: String(summary.manual_review),
      hint: "Escalated to an operator",
      accent: "bg-lavender/70",
    },
    {
      label: "Avg confidence",
      value: formatConfidence(summary.average_confidence),
      hint: "Average across completed decisions",
      accent: "bg-white/85",
    },
  ];

  const approvalRate =
    summary.total_claims > 0
      ? Math.round((summary.approved / summary.total_claims) * 100)
      : 0;

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Operations"
        title="Dashboard"
        description="Claims operations overview for submitted OPD adjudication requests."
        actions={
          <div className="rounded-full border border-plum/10 bg-lavender/55 px-4 py-2 text-xs font-medium text-ink/72">
            Active extractor:{" "}
            <span className="text-plum">
              <span className="text-ink capitalize">
                {summary.ai_provider || "Unavailable"}
              </span>
            </span>
          </div>
        }
      />
      {error && (
        <div className="rounded-[18px] border border-clay/25 bg-clay/8 px-5 py-4 text-sm text-clay">
          <span className="font-medium">Dashboard data is stale.</span> {error}
        </div>
      )}

      {/* Decision breakdown cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {decisionCards.map((card) => (
          <div key={card.label} className={`panel p-5 ${card.accent}`}>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
              {card.label}
            </p>
            <p className="mt-3 font-display text-3xl">{card.value}</p>
            <p className="mt-1.5 text-sm text-ink/60">{card.hint}</p>
          </div>
        ))}
      </div>

      {/* Financial summary + approval rate */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Financial summary
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-[18px] bg-sand px-5 py-4">
              <span className="text-sm text-ink/65">Total claimed</span>
              <span className="text-xl font-semibold">
                {formatMoney(summary.total_claimed_amount)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-[18px] bg-white px-5 py-4">
              <span className="text-sm text-ink/65">Total approved</span>
              <span className="text-xl font-semibold">
                {formatMoney(summary.total_approved_amount)}
              </span>
            </div>
            {summary.total_claimed_amount > 0 && (
              <div className="flex items-center justify-between rounded-[18px] border border-ink/8 px-5 py-4">
                <span className="text-sm text-ink/65">Approval rate</span>
                <span className="text-xl font-semibold">{approvalRate}%</span>
              </div>
            )}
          </div>
        </section>

        <section className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Manual review queue
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Claims needing human attention surface here as recent review
            signals.
          </p>
          {summary.recent_flags.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {summary.recent_flags.map((flag: string) => (
                <span
                  key={flag}
                  className="rounded-full border border-clay/25 bg-clay/10 px-3 py-1.5 text-sm text-clay"
                >
                  {flag}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState
              eyebrow="Risk queue"
              title="No recent flags"
              description="Manual review signals will appear here once claims trigger fraud checks or low-confidence routing."
            />
          )}
        </section>
      </div>

      {/* Decision distribution + policy snapshot */}
      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Decision distribution
          </p>
          {summary.total_claims > 0 ? (
            <div className="mt-5 space-y-3">
              {[
                { label: "Approved", count: summary.approved, status: "approved" },
                { label: "Rejected", count: summary.rejected, status: "rejected" },
                { label: "Partial", count: summary.partial, status: "partial" },
                { label: "Manual review", count: summary.manual_review, status: "manual_review" },
              ].map(({ label, count, status }) => (
                <div key={label} className="flex items-center gap-3">
                  <StatusBadge status={status} />
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs text-ink/50">
                      <span>{label}</span>
                      <span>{Math.round((count / summary.total_claims) * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-2 rounded-full bg-ink/30 transition-all"
                        style={{
                          width: `${Math.round((count / summary.total_claims) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="w-8 text-right text-sm font-medium">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              eyebrow="Distribution"
              title="No adjudications yet"
              description="Run a few claims or test cases to populate the decision mix and approval trends."
            />
          )}
        </section>

        <section className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Recent decisions
          </p>
          <div className="mt-4 space-y-3">
            {[
              ["Approved", summary.approved, "approved"],
              ["Rejected", summary.rejected, "rejected"],
              ["Partial", summary.partial, "partial"],
              ["Manual review", summary.manual_review, "manual_review"],
            ].map(([label, count, status]) => (
              <div
                key={label}
                className="flex items-center justify-between rounded-[20px] border border-plum/8 bg-white/70 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <StatusBadge status={String(status)} />
                  <span className="text-sm text-ink/68">{label}</span>
                </div>
                <span className="font-display text-2xl text-ink">{count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Policy snapshot
          </p>
          <div className="mt-4 space-y-3">
            {[
              ["Engine", "Deterministic rule evaluation"],
              ["Policy source", "policy_terms.json"],
              ["AI extraction", summary.ai_provider],
              ["Fallback", "Structured intake form"],
              ["Manual review", "Fraud + low confidence"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-4 border-b border-ink/8 pb-3 last:border-0 last:pb-0"
              >
                <span className="text-sm text-ink/55">{k}</span>
                <span className="text-sm font-medium capitalize">{v}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel p-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Ops notes
          </p>
          <div className="mt-4 space-y-3">
            {[
              "Use the claims ledger to inspect individual outcomes and audit traces.",
              "Run Plum test cases after rule changes to protect evaluator confidence.",
              "Manual review should be reserved for fraud signals and weak extraction evidence.",
            ].map((note) => (
              <div
                key={note}
                className="rounded-[20px] border border-plum/8 bg-white/70 px-4 py-3 text-sm leading-relaxed text-ink/68"
              >
                {note}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
