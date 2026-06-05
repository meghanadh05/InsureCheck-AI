export function ConfidenceMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const barColor =
    pct >= 80 ? "bg-pine" : pct >= 55 ? "bg-sand border border-sand/60" : "bg-clay";
  const labelColor =
    pct >= 80 ? "text-pine" : pct >= 55 ? "text-ink" : "text-clay";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
          Confidence
        </span>
        <span className={`text-sm font-semibold ${labelColor}`}>{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-2 rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
