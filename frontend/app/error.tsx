"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="panel px-6 py-12 text-center md:px-10">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-clay/70">
        Frontend error
      </p>
      <h2 className="mt-3 font-display text-3xl text-ink">
        This page did not load cleanly
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-ink/65">
        The UI hit an unexpected render error. Retry the page state below
        before checking the API or browser console.
      </p>
      <div className="mx-auto mt-6 max-w-2xl rounded-[20px] border border-clay/20 bg-clay/8 px-4 py-3 text-left text-sm text-clay">
        {error.message || "Unknown render error"}
      </div>
      <button
        onClick={reset}
        className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
      >
        Retry page
      </button>
    </main>
  );
}
