import { ConfidenceMeter } from "./ConfidenceMeter";
import { StatusBadge } from "./StatusBadge";
import { formatMoney } from "../lib/format";

export type Decision = {
  decision: string;
  approved_amount: number;
  confidence_score: number;
  notes?: string;
  deductions?: Record<string, number>;
  flags?: string[];
};

export function DecisionCard({ decision }: { decision: Decision }) {
  return (
    <div className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            Adjudication decision
          </p>
          <h3 className="mt-2 font-display text-3xl">{decision.decision}</h3>
        </div>
        <StatusBadge status={decision.decision} />
      </div>

      <p className="mt-4 text-2xl font-semibold">
        {formatMoney(decision.approved_amount)}
        <span className="ml-2 text-base font-normal text-ink/55">approved</span>
      </p>

      <div className="mt-5">
        <ConfidenceMeter score={decision.confidence_score} />
      </div>

      {decision.notes && (
        <p className="mt-4 text-sm leading-relaxed text-ink/70">{decision.notes}</p>
      )}

      {!!decision.deductions && Object.keys(decision.deductions).length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
            Deductions
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(decision.deductions).map(([key, value]) => (
              <span
                key={key}
                className="rounded-full bg-sand px-3 py-1 text-sm text-ink"
              >
                {key}: {formatMoney(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!decision.flags?.length && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
            Risk flags
          </p>
          <div className="flex flex-wrap gap-2">
            {decision.flags.map((flag) => (
              <span
                key={flag}
                className="rounded-full border border-clay/25 bg-clay/10 px-3 py-1 text-sm text-clay"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
