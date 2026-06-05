"use client";

import { useEffect, useState } from "react";

import { API_URL } from "../../lib/api";

type SampleDocument = {
  document_type: string;
  filename: string;
  preview_text: string;
  download_url: string;
  case_type?: string;
  supported_case_types?: string[];
};

const descriptions: Record<string, string> = {
  prescription: "Use during claim intake when a prescription example is needed.",
  medical_bill: "Use for billing review and charge validation.",
  diagnostic_report: "Use to support reported treatment and advised tests.",
  pharmacy_bill: "Use for medicine invoice review alongside the prescription.",
};

const caseTypeLabels: Record<string, string> = {
  approved: "Approved scenario",
  rejected: "Rejected scenario",
  partial: "Partial scenario",
  manual_review: "Manual review scenario",
};

function resolveDownloadUrl(downloadUrl: string) {
  if (downloadUrl.startsWith("http://") || downloadUrl.startsWith("https://")) {
    return downloadUrl;
  }

  const apiOrigin = API_URL.replace(/\/api\/?$/, "");
  return `${apiOrigin}${downloadUrl}`;
}

function buildSampleDownloadUrl(documentType: string, caseType: string, format: "txt" | "pdf") {
  const apiOrigin = API_URL.replace(/\/api\/?$/, "");
  const params = new URLSearchParams({
    case_type: caseType,
    format,
  });
  return `${apiOrigin}/api/sample-documents/${documentType}/download?${params.toString()}`;
}

export default function SampleDocumentsPage() {
  const [documents, setDocuments] = useState<SampleDocument[]>([]);
  const [caseTypes, setCaseTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const listRes = await fetch(`${API_URL}/sample-documents`, {
        cache: "no-store",
      });
      const listJson = await listRes.json();
      const items = listJson.available_documents as Array<{
        document_type: string;
      }>;
      const fullDocs = await Promise.all(
        items.map(async (item) => {
          const res = await fetch(`${API_URL}/sample-documents/${item.document_type}`, {
            cache: "no-store",
          });
          return (await res.json()) as SampleDocument;
        })
      );
      const initialCaseTypes = Object.fromEntries(
        fullDocs.map((document) => [
          document.document_type,
          document.supported_case_types?.[0] || "approved",
        ])
      );
      setCaseTypes(initialCaseTypes);
      setDocuments(fullDocs);
    }
    void load();
  }, []);

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  async function generateDocument(documentType: string, caseType: string) {
    const res = await fetch(`${API_URL}/sample-documents/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        document_type: documentType,
        case_type: caseType,
      }),
    });
    if (!res.ok) {
      return;
    }
    const generated = (await res.json()) as SampleDocument;
    setDocuments((current) =>
      current.map((document) =>
        document.document_type === documentType ? generated : document
      )
    );
    setCaseTypes((current) => ({ ...current, [documentType]: caseType }));
  }

  return (
    <main className="space-y-6">
      <section className="panel p-6 md:p-8">
        <p className="eyebrow">Sample Medical Documents</p>
        <h2 className="mt-3 font-display text-3xl text-ink">
          Sample document templates for upload and review
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink/68">
          Use these sample templates to test document upload, extraction, and
          claim review flows without relying on live medical records.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {documents.map((document) => (
          <section key={document.document_type} className="panel p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <p className="text-lg font-semibold capitalize text-ink">
                  {document.document_type.replace(/_/g, " ")}
                </p>
                <p className="mt-1 text-sm text-ink/60">
                  {descriptions[document.document_type]}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <select
                  value={caseTypes[document.document_type] || "approved"}
                  onChange={(event) =>
                    void generateDocument(
                      document.document_type,
                      event.target.value
                    )
                  }
                  className="rounded-full border border-plum/10 bg-white/80 px-4 py-2 text-sm text-ink outline-none"
                >
                  {(document.supported_case_types || ["approved"]).map((caseType) => (
                    <option key={caseType} value={caseType}>
                      {caseTypeLabels[caseType] || caseType}
                    </option>
                  ))}
                </select>
                <a
                  href={buildSampleDownloadUrl(
                    document.document_type,
                    caseTypes[document.document_type] || "approved",
                    "pdf"
                  )}
                  className="secondary-button"
                >
                  Download PDF
                </a>
              </div>
            </div>
            <div className="mt-4 rounded-[18px] border border-plum/8 bg-lavender/35 px-4 py-3 text-sm text-ink/70">
              Showing:{" "}
              <span className="font-medium text-ink">
                {caseTypeLabels[caseTypes[document.document_type] || "approved"]}
              </span>
            </div>
            <pre className="mt-5 max-h-72 overflow-auto rounded-[20px] border border-plum/8 bg-white/80 p-4 text-xs leading-relaxed text-ink/78">
              {document.preview_text}
            </pre>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href={buildSampleDownloadUrl(
                  document.document_type,
                  caseTypes[document.document_type] || "approved",
                  "txt"
                )}
                className="secondary-button"
              >
                Download text
              </a>
              <button
                type="button"
                onClick={() => copyText(document.preview_text)}
                className="primary-button"
              >
                Copy text
              </button>
              <p className="self-center text-xs text-ink/55">
                Use this text in the document input field or upload it from the
                submit page.
              </p>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
