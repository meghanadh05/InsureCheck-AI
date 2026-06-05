import { LoadingSkeleton } from "../components/LoadingSkeleton";

export default function Loading() {
  return (
    <main className="space-y-6">
      <section className="panel p-6 md:p-8">
        <div className="h-3 w-24 animate-pulse rounded-full bg-ink/10" />
        <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-[18px] bg-ink/8" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-full bg-ink/6" />
        <div className="mt-2 h-4 w-4/5 max-w-xl animate-pulse rounded-full bg-ink/6" />
      </section>
      <section className="panel overflow-hidden">
        <div className="border-b border-ink/8 px-6 py-4">
          <div className="h-3 w-36 animate-pulse rounded-full bg-ink/8" />
        </div>
        <LoadingSkeleton rows={5} />
      </section>
    </main>
  );
}
