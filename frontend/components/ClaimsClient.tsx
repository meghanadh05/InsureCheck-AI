"use client";

import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "./EmptyState";
import { StatusBadge } from "./StatusBadge";
import { formatDate, formatMoney } from "../lib/format";

type Claim = {
  claim_id: string;
  status: string;
  member_name: string;
  treatment_date: string;
  claim_amount: number;
  notes?: string | null;
};

export function ClaimsClient({ claims }: { claims: Claim[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const uniqueStatuses = Array.from(
    new Set(claims.map((c) => (c.status || "pending").toLowerCase()))
  );
  const statuses = ["all", ...uniqueStatuses];

  const filtered = claims.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      (c.member_name || "").toLowerCase().includes(q) ||
      (c.claim_id || "").toLowerCase().includes(q);
    const matchesFilter =
      filter === "all" || (c.status || "pending").toLowerCase() === filter;
    return matchesSearch && matchesFilter;
  });

  const activeCount = filtered.length;

  return (
    <>
      <div className="space-y-4 border-b border-ink/8 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="w-full lg:max-w-sm">
            <input
              type="text"
              placeholder="Search member name or claim ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-full border border-ink/10 bg-white/80 px-4 py-2.5 text-sm outline-none placeholder:text-ink/35 focus:border-ink/25"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/45">
            <span>{activeCount} shown</span>
            {(search || filter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-[11px] tracking-[0.16em] text-ink/65 transition hover:bg-white/80"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => {
            const count =
              s === "all"
                ? claims.length
                : claims.filter(
                    (claim) => (claim.status || "pending").toLowerCase() === s
                  ).length;

            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === s
                    ? "border-ink bg-ink text-white"
                    : "border-ink/10 bg-white/70 text-ink/65 hover:bg-white"
                }`}
              >
                {s === "all" ? "All decisions" : s.replace(/_/g, " ")} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          eyebrow="Claim queue"
          title={
            search || filter !== "all"
              ? "No matching claims"
              : "No claims submitted yet"
          }
          description={
            search || filter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "Submit your first OPD claim to see it adjudicated here."
          }
          action={
            !search && filter === "all"
              ? { label: "Submit first claim", href: "/submit" }
              : undefined
          }
        />
      ) : (
        <div className="divide-y divide-ink/8">
          {filtered.map((claim) => (
            <div
              key={claim.claim_id}
              className="grid gap-4 px-4 py-4 transition hover:bg-white/40 sm:px-6 lg:grid-cols-[1.5fr_1.1fr_0.9fr_1fr_1.2fr_auto] lg:items-center"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">
                  {claim.claim_id}
                </div>
                <div className="mt-0.5 truncate text-xs text-ink/55">
                  {claim.member_name || "Member name unavailable"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm lg:block">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink/40 lg:hidden">
                    Treatment date
                  </p>
                  <p className="text-sm text-ink/70">
                    {formatDate(claim.treatment_date)}
                  </p>
                </div>
                <div className="lg:hidden">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink/40">
                    Claim amount
                  </p>
                  <p className="text-sm font-semibold">
                    {formatMoney(claim.claim_amount || 0)}
                  </p>
                </div>
              </div>
              <div className="hidden text-sm font-semibold lg:block">
                {formatMoney(claim.claim_amount || 0)}
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={claim.status} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink/40 lg:hidden">
                  Notes
                </p>
                <div className="truncate text-xs text-ink/50">
                  {claim.notes?.trim() || "Awaiting adjudication"}
                </div>
              </div>
              <Link
                href={`/claims/${claim.claim_id}`}
                className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink px-4 py-2 text-xs font-medium text-white transition hover:opacity-85"
              >
                View decision
              </Link>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
