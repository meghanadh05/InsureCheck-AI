import type { Route } from "next";
import Link from "next/link";

type Props = {
  title: string;
  description: string;
  action?: { label: string; href: Route<string> };
  eyebrow?: string;
};

export function EmptyState({ title, description, action, eyebrow }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center sm:px-10">
      <div className="mb-5 rounded-full border border-ink/8 bg-ink/6 p-5">
        <svg
          className="h-8 w-8 text-ink/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      {eyebrow && (
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/45">
          {eyebrow}
        </p>
      )}
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/60">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
