"use client";

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PageHeader } from "../../components/PageHeader";
import { ClaimForm } from "../../components/ClaimForm";
import { API_URL, BACKEND_UNREACHABLE_MESSAGE } from "../../lib/api";
import { ClaimUploadFiles, UploadBox } from "../../components/UploadBox";

const EMPTY_UPLOADS: ClaimUploadFiles = {
  prescription: null,
  medical_bill: null,
  diagnostic_report: null,
  pharmacy_bill: null,
};

export default function SubmitPage() {
  const [files, setFiles] = useState<ClaimUploadFiles>(EMPTY_UPLOADS);
  const [uploadResetVersion, setUploadResetVersion] = useState(0);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState("");
  const [extractedPreview, setExtractedPreview] = useState<{
    combined_text: string;
    extracted_fields?: Record<string, unknown>;
  } | null>(null);
  const attachedCount = Object.values(files).filter(Boolean).length;

  useEffect(() => {
    const hasUploads = Object.values(files).some(Boolean);
    if (!hasUploads) {
      setExtractedPreview(null);
      setExtractError("");
      return;
    }

    const controller = new AbortController();

    async function extractFromUploads() {
      setExtracting(true);
      setExtractError("");
      try {
        const formData = new FormData();
        Object.entries(files).forEach(([key, file]) => {
          if (file) {
            formData.append(key, file);
          }
        });

        const response = await fetch(`${API_URL}/documents/extract`, {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok) {
          throw new Error(body.detail || "Document extraction failed");
        }
        setExtractedPreview(body);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setExtractError(
          error instanceof TypeError
            ? BACKEND_UNREACHABLE_MESSAGE
            : String(error)
        );
      } finally {
        if (!controller.signal.aborted) {
          setExtracting(false);
        }
      }
    }

    void extractFromUploads();
    return () => controller.abort();
  }, [files]);

  return (
    <main className="space-y-6">
      <PageHeader
        eyebrow="Claim intake"
        title="Submit a claim"
        description="Capture member details, treatment information, supporting documents, and receive a policy-backed claim decision."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
        <div className="space-y-6">
          <section className="soft-panel p-6">
            <p className="eyebrow">Guided workspace</p>
            <h3 className="mt-3 font-display text-2xl text-ink">
              A simpler path from intake to decision
            </h3>
            <div className="mt-4 space-y-3 text-sm leading-relaxed text-ink/68">
              <p>
                Add claim details, attach supporting documents, and review the
                decision in one place.
              </p>
              <p>
                The form is designed for quick intake, policy validation, and
                clear decision tracking.
              </p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                `${attachedCount} of 4 documents attached`,
                extracting ? "Extracting details from uploaded documents" : "Auto-fill from uploaded documents",
                "Decision returned after submission",
                "Manual review flags stay visible",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-plum/8 bg-white/70 px-4 py-3 text-sm font-medium text-ink"
                >
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-[22px] border border-plum/8 bg-white/70 p-4">
              <p className="text-sm font-semibold text-ink">Need sample documents?</p>
              <p className="mt-1 text-sm text-ink/62">
                Open ready-to-use prescription, bill, report, and pharmacy templates.
              </p>
              <Link href="/sample-documents" className="secondary-button mt-4">
                View sample templates
              </Link>
            </div>
            {extractError && (
              <div className="rounded-[18px] border border-clay/25 bg-clay/8 px-4 py-3 text-sm text-clay">
                <span className="font-medium">Document extraction failed.</span> {extractError}
              </div>
            )}
          </section>
          <UploadBox
            files={files}
            resetVersion={uploadResetVersion}
            onFileChange={(documentType, file) =>
              setFiles((current) => ({ ...current, [documentType]: file }))
            }
          />
        </div>
        <ClaimForm
          uploadedFiles={files}
          extractedPreview={extractedPreview}
          onResetUploads={() => {
            setFiles(EMPTY_UPLOADS);
            setExtractedPreview(null);
            setExtractError("");
            setUploadResetVersion((current) => current + 1);
          }}
        />
      </div>
    </main>
  );
}
