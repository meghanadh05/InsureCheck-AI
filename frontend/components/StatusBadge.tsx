const styles: Record<string, string> = {
  approved: "border-pine/20 bg-pine/12 text-pine",
  rejected: "border-clay/25 bg-clay/12 text-clay",
  partial: "border-peach/60 bg-sand text-ink",
  manual_review: "border-plum/12 bg-lavender text-plum",
  pending: "border-plum/10 bg-plum/5 text-ink/55",
  pass: "border-pine/20 bg-pine/12 text-pine",
  fail: "border-clay/25 bg-clay/12 text-clay",
  running: "border-plum/12 bg-white text-ink/70",
};

function normalizeStatus(status?: string | null) {
  return (status ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function labelForStatus(status?: string | null) {
  const key = normalizeStatus(status);
  if (!key) return "Unknown";
  return key.replace(/_/g, " ");
}

export function StatusBadge({ status }: { status?: string | null }) {
  const key = normalizeStatus(status);
  const cls = styles[key] ?? styles.pending;

  return (
    <span
      className={`status-badge ${cls}`}
    >
      {labelForStatus(status)}
    </span>
  );
}
