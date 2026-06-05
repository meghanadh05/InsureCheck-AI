import Link from "next/link";

const capabilityCards = [
  {
    title: "AI-assisted extraction",
    description:
      "Capture diagnosis, provider, and billing details from uploaded documents to speed up intake review.",
  },
  {
    title: "Deterministic policy engine",
    description:
      "Every outcome maps back to policy checks, benefit limits, and deduction logic.",
  },
  {
    title: "Manual review routing",
    description:
      "Flagged claims stay visible for reviewer follow-up instead of disappearing into a black box.",
  },
  {
    title: "Audit trail",
    description:
      "Decision traces, extraction details, and reviewer notes stay attached to each claim.",
  },
  {
    title: "Confidence scoring",
    description:
      "Teams can quickly separate clear approvals from claims that need a second look.",
  },
  {
    title: "Validation suite",
    description:
      "Run scenario checks through the same decision flow used for live claims.",
  },
];

const workflow = [
  ["Capture claim", "Collect member details, treatment data, and supporting documents in one guided intake flow."],
  ["Extract fields", "Parse prescriptions, bills, and reports to pre-fill claim details before review."],
  ["Check policy", "Validate eligibility, document quality, limits, co-pay, and medical coverage against policy terms."],
  ["Route decision", "Approve, partially approve, reject, or escalate with a clear rule trace and next-step context."],
];

const trust = [
  "Validated scenarios",
  "Configurable policy rules",
  "Explainable decisions",
  "Review routing",
];

export default function HomePage() {
  return (
    <main className="space-y-6">
      <section className="panel section-shell">
        <div className="decor-orb -left-16 top-8 h-44 w-44 bg-lavender/80" />
        <div className="decor-orb right-0 top-20 h-40 w-40 bg-peach/70" />
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="relative z-10">
            <p className="eyebrow">Healthcare claims automation</p>
            <h2 className="hero-title mt-5 max-w-3xl text-ink">
              Policy-backed OPD claim decisions, with audit-ready reasoning.
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink/72">
              InsureCheck AI combines document extraction with policy rules so
              claims can be reviewed, decided, and tracked with clear reasoning.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/submit" className="primary-button">
                Submit a Claim
              </Link>
              <Link href="/test-cases" className="secondary-button">
                Run Validation Suite
              </Link>
              <Link href="/dashboard" className="secondary-button">
                View Dashboard
              </Link>
            </div>
          </div>

          <div className="relative z-10 lg:px-6">
            <div className="floating-card plum-gradient p-1 shadow-panel">
              <div className="rounded-[26px] bg-white/92 p-5 sm:p-6 lg:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow">Sample decision</p>
                    <h3 className="mt-2 font-display text-3xl text-ink">
                      APPROVED
                    </h3>
                  </div>
                  <span className="status-badge border-pine/20 bg-pine/12 text-pine">
                    Ready
                  </span>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="soft-panel p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                      Approved amount
                    </p>
                    <p className="mt-2 font-display text-3xl text-ink">
                      ₹1,350
                    </p>
                  </div>
                  <div className="soft-panel p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                      Confidence
                    </p>
                    <p className="mt-2 font-display text-3xl text-ink">95%</p>
                  </div>
                </div>
                <div className="mt-5 rounded-[24px] border border-plum/10 bg-lavender/45 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-plum/80">
                    Rule trace
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[
                      "Policy active",
                      "Documents valid",
                      "Co-pay applied",
                    ].map((item) => (
                      <span
                        key={item}
                        className="status-badge border-plum/10 bg-white/75 text-plum"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid gap-3 lg:hidden">
                  <div className="floating-card bg-peach/45 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                      Review note
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink/70">
                      Human review stays visible for flagged claims.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="floating-card absolute bottom-5 right-0 hidden max-w-[11.5rem] translate-x-1/4 bg-peach/45 p-3 xl:block">
              <p className="text-xs uppercase tracking-[0.18em] text-ink/45">
                Review note
              </p>
              <p className="mt-2 text-sm text-ink/70">
                Human review stays visible for flagged claims.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel section-shell">
        <p className="eyebrow">How it works</p>
        <h3 className="mt-3 font-display text-3xl text-ink">
          From intake to adjudication in four clear steps
        </h3>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {workflow.map(([title, detail], index) => (
            <div key={title} className="soft-panel p-5">
              <p className="font-display text-4xl text-plum/20">
                0{index + 1}
              </p>
              <h4 className="mt-3 text-lg font-semibold text-ink">{title}</h4>
              <p className="mt-2 text-sm leading-relaxed text-ink/68">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel section-shell">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Capabilities</p>
            <h3 className="mt-3 font-display text-3xl text-ink">
              Built for claims teams handling real adjudication work
            </h3>
          </div>
          <p className="max-w-xl text-sm leading-relaxed text-ink/65">
            Clear, operational, and easy to review. The product keeps the logic
            visible without overwhelming the user.
          </p>
        </div>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {capabilityCards.map((card) => (
            <div key={card.title} className="floating-card p-5">
              <div className="inline-flex rounded-full bg-lavender/75 px-3 py-2 text-sm font-semibold text-plum">
                {card.title}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink/68">
                {card.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="soft-panel px-6 py-5 md:px-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trust.map((item) => (
            <div
              key={item}
              className="rounded-[22px] border border-plum/8 bg-white/70 px-4 py-4 text-sm font-medium text-ink"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="panel section-shell plum-gradient text-white">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow text-white/70">Final step</p>
            <h3 className="mt-3 font-display text-3xl leading-tight">
              Start reviewing claims with the full decision workflow.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/74">
              Submit a claim, inspect the decision trace, and run scenario
              checks through the same production workflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/submit"
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-plum transition hover:opacity-92"
            >
              Submit a Claim
            </Link>
            <Link
              href="/test-cases"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Run Validation Suite
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
