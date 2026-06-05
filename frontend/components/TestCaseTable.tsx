import { formatConfidence } from "../lib/format";
import { StatusBadge } from "./StatusBadge";

type TestResult = {
  case_id: string;
  case_name: string;
  expected_decision: string;
  actual_decision: string;
  passed: boolean;
  confidence_score: number;
  notes: string;
};

export function TestCaseTable({ results }: { results: TestResult[] }) {
  return (
    <div className="panel overflow-hidden">
      <div className="overflow-x-auto">
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
                Confidence
              </th>
              <th className="px-5 py-3 text-xs font-medium uppercase tracking-wide">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
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
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${
                      result.passed
                        ? "border-pine/25 bg-pine/12 text-pine"
                        : "border-clay/25 bg-clay/12 text-clay"
                    }`}
                  >
                    {result.passed ? "Pass" : "Fail"}
                  </span>
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
    </div>
  );
}
