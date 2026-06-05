type TraceEntry = {
  rule?: string;
  step?: string;
  result?: string;
  reason?: string;
  [key: string]: unknown;
};

function dotColor(result?: string) {
  if (!result) return "bg-ink/20";
  const r = result.toLowerCase();
  if (r === "pass" || r === "approved" || r === "ok") return "bg-pine";
  if (r === "fail" || r === "rejected" || r === "error") return "bg-clay";
  return "bg-ink/30";
}

function labelStyle(result?: string) {
  if (!result) return "bg-ink/8 text-ink/55";
  const r = result.toLowerCase();
  if (r === "pass" || r === "approved" || r === "ok")
    return "bg-pine/12 text-pine";
  if (r === "fail" || r === "rejected" || r === "error")
    return "bg-clay/12 text-clay";
  return "bg-ink/8 text-ink/55";
}

export function RuleTraceTimeline({ trace }: { trace: unknown[] }) {
  if (!trace?.length) {
    return (
      <p className="text-sm text-ink/50">
        No audit trace recorded for this decision.
      </p>
    );
  }

  const entries = trace as TraceEntry[];

  return (
    <ol className="space-y-0">
      {entries.map((entry, i) => (
        <li key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`mt-0.5 h-4 w-4 shrink-0 rounded-full ${dotColor(entry.result)}`}
            />
            {i < entries.length - 1 && (
              <div className="my-1 w-px flex-1 bg-ink/10" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-ink">
                {entry.rule || entry.step || `Step ${i + 1}`}
              </p>
              {entry.result && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${labelStyle(entry.result)}`}
                >
                  {entry.result}
                </span>
              )}
            </div>
            {entry.reason && (
              <p className="mt-0.5 text-sm text-ink/60">
                {String(entry.reason)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
