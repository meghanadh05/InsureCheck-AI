export const formatMoney = (amount: number): string =>
  `₹${Number.isFinite(amount) ? amount.toLocaleString("en-IN") : "0"}`;

export const formatConfidence = (score: number): string =>
  `${Math.max(0, Math.min(100, Math.round((score || 0) * 100)))}%`;

export const formatDate = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return dateStr || "Not provided";
    }
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr || "Not provided";
  }
};
