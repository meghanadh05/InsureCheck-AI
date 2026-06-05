import { getJson } from "../../lib/api";
import { ClaimsClient } from "../../components/ClaimsClient";
import { PageHeader } from "../../components/PageHeader";
import Link from "next/link";

type Claim = {
  claim_id: string;
  status: string;
  member_name: string;
  treatment_date: string;
  claim_amount: number;
  notes?: string | null;
};

export default async function ClaimsPage() {
  const { data: claims, error } = await getJson<Claim[]>("/claims", []);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Ledger"
        title="Claim queue"
        description="Review all submitted OPD claims, track adjudication decisions, and investigate individual outcomes."
        actions={
          <Link
            href="/submit"
            className="inline-flex items-center rounded-full bg-ink px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Submit new claim
          </Link>
        }
      />
      {error && (
        <div className="rounded-[18px] border border-clay/25 bg-clay/8 px-5 py-4 text-sm text-clay">
          <span className="font-medium">Queue data is stale.</span> {error} The
          list below shows the most recently available claim records.
        </div>
      )}
      <div className="panel overflow-hidden">
        <div className="border-b border-ink/8 px-4 py-4 sm:px-6">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
            {claims.length} claim{claims.length !== 1 ? "s" : ""} on record
          </p>
          <p className="mt-1 text-sm text-ink/60">
            Filter by decision status, search by member or claim ID, and open
            any claim for the full decision trace.
          </p>
        </div>
        <ClaimsClient claims={claims} />
      </div>
    </main>
  );
}
