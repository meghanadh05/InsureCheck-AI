export function LoadingSkeleton({
  rows = 4,
  compact = false,
}: {
  rows?: number;
  compact?: boolean;
}) {
  return (
    <div className={`space-y-3 ${compact ? "p-0" : "p-6"}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-[18px] bg-ink/6 ${
            compact ? "h-11" : "h-14"
          }`}
          style={{ opacity: 1 - i * 0.18 }}
        />
      ))}
    </div>
  );
}
