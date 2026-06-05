"use client";

import { useState } from "react";

import { EmptyState } from "../../components/EmptyState";
import { LoadingSkeleton } from "../../components/LoadingSkeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { API_URL, BACKEND_UNREACHABLE_MESSAGE } from "../../lib/api";
import { formatConfidence } from "../../lib/format";

type TestResult = {
  case_id: string;
  case_name: string;
  expected_decision: string;
  actual_decision: string;
  passed: boolean;
  amount_check: boolean;
  expected_approved_amount?: number | null;
  actual_approved_amount?: number | null;
  confidence_score: number;
  notes: string;
};

type TestSummary = {
  total: number;
  passed: number;
  failed: number;
};

type TestResults = {
  summary: TestSummary;
  results: TestResult[];
};

type Status = "idle" | "running" | "done" | "error";

export default function TestCasesPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [data, setData] = useState<TestResults | null>(null);
  const [error, setError] = useState<string>("");

  async function runTests() {
    setStatus("running");
    setError("");
    setData(null);
    try {
      const res = await fetch(`${API_URL}/test-cases/run`, {
        method: "POST",
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error(`API ${res.status}: ${res.statusText}`);
      }
      const json = (await res.json()) as TestResults;
      setData(json);
      setStatus("done");
    } catch (err) {
      const message =
        err instanceof TypeError
          ? BACKEND_UNREACHABLE_MESSAGE
          : String(err);
      setError(message);
      setStatus("error");
    }
  }

  const passRate =
    data && data.summary.total > 0
      ? Math.round((data.summary.passed / data.summary.total) * 100)
      : 0;

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="panel p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
              Validation suite
            </p>
            <h2 className="mt-2 font-display text-3xl">Scenario validation</h2>
            <p className="mt-2 max-w-xl text-sm text-ink/70">
              Run the scenario suite through the same production adjudication
              engine used by live claims. Each case compares expected decisions
              with actual engine output.
            </p>
          </div>
          {status !== "running" && (
            <button
              onClick={runTests}
              className="shrink-0 rounded-full bg-ink px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {status === "done" || status === "error"
                ? "Rerun tests"
                : "Run validation suite"}
            </button>
          )}
        </div>
      </div>

      {/* Idle state */}
      {status === "idle" && (
        <div className="panel overflow-hidden">
          <EmptyState
            eyebrow="Validation suite"
            title="No results yet"
            description="Run the validation suite to confirm live decision behavior before rolling out claim or policy updates."
          />
        </div>
      )}

      {/* Running state */}
      {status === "running" && (
        <div className="panel overflow-hidden">
          <div className="px-6 pt-6">
            <div className="flex items-center gap-3">
              <svg
                className="h-5 w-5 animate-spin text-ink/40"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm font-medium text-ink/70">
                Running cases through the production adjudication engine...
              </p>
            </div>
            <p className="mt-2 text-sm text-ink/55">
              Results will replace this skeleton automatically when the run
              finishes.
            </p>
          </div>
          <LoadingSkeleton rows={5} />
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="rounded-[18px] border border-clay/25 bg-clay/8 px-5 py-4 text-sm text-clay">
          <span className="font-medium">Run failed.</span> {error} The API did
          not return a usable regression result set.
        </div>
      )}

      {/* Results */}
      {status === "done" && data && (
        <>
          {/* Summary cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                label: "Total cases",
                value: String(data.summary.total),
                hint: "Validated scenarios",
              },
              {
                label: "Passed",
                value: String(data.summary.passed),
                hint: "Matching production outcomes",
              },
              {
                label: "Failed",
                value: String(data.summary.failed),
                hint: "Cases needing rule review",
              },
              {
                label: "Pass rate",
                value: `${passRate}%`,
                hint: "Regression success ratio",
              },
            ].map((card) => (
              <div key={card.label} className="panel p-5">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
                  {card.label}
                </p>
                <p className="mt-3 font-display text-3xl">{card.value}</p>
                <p className="mt-1.5 text-sm text-ink/60">{card.hint}</p>
              </div>
            ))}
          </div>

          {/* Results table */}
          <div className="panel overflow-hidden">
            <div className="border-b border-ink/8 px-4 py-4 sm:px-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
                {data.summary.passed}/{data.summary.total} cases passing
              </p>
              <p className="mt-0.5 text-sm text-ink/60">
                Every case runs through the same adjudication engine as live
                claims.
              </p>
            </div>
            {data.results.length === 0 ? (
              <EmptyState
                eyebrow="Regression runner"
                title="No case rows returned"
                description="The run completed without per-case output. Check the test-case endpoint contract before trusting the summary above."
              />
            ) : (
              <>
                <div className="space-y-4 p-4 sm:hidden">
                  {data.results.map((result) => (
                    <article
                      key={result.case_id}
                      className="rounded-[22px] border border-ink/8 bg-white/70 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-ink">
                            {result.case_id}
                          </p>
                          <p className="mt-0.5 text-xs text-ink/55">
                            {result.case_name}
                          </p>
                        </div>
                        <StatusBadge status={result.passed ? "pass" : "fail"} />
                      </div>
                      <div className="mt-4 grid gap-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/50">Expected</span>
                          <StatusBadge status={result.expected_decision} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/50">Actual</span>
                          <StatusBadge status={result.actual_decision} />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/50">Amount check</span>
                          <StatusBadge
                            status={result.amount_check ? "pass" : "fail"}
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-ink/50">Confidence</span>
                          <span className="font-medium">
                            {formatConfidence(result.confidence_score)}
                          </span>
                        </div>
                        <div>
                          <p className="text-ink/50">Notes</p>
                          <p className="mt-1 text-sm text-ink/65">
                            {result.notes || "Matched expected output"}
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="hidden overflow-x-auto sm:block">
                  <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="bg-ink text-white">
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Case
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Expected
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Actual
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Result
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Amount Check
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Confidence
                    </th>
                    <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((result) => (
                    <tr
                      key={result.case_id}
                      className="border-t border-ink/8 transition hover:bg-white/40"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium">{result.case_id}</div>
                        <div className="mt-0.5 text-xs text-ink/55">
                          {result.case_name}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={result.expected_decision} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={result.actual_decision} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={result.passed ? "pass" : "fail"} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge
                          status={result.amount_check ? "pass" : "fail"}
                        />
                      </td>
                      <td className="px-5 py-4 text-sm font-medium">
                        {formatConfidence(result.confidence_score)}
                      </td>
                      <td className="px-5 py-4 text-sm text-ink/60">
                        {result.notes || "Matched expected output"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </main>
  );
}
