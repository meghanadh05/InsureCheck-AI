"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { ConfidenceMeter } from "./ConfidenceMeter";
import { StatusBadge } from "./StatusBadge";
import { ClaimUploadFiles } from "./UploadBox";
import { API_URL, BACKEND_UNREACHABLE_MESSAGE } from "../lib/api";
import { formatMoney } from "../lib/format";

type FormData = {
  memberId: string;
  familyId: string;
  memberName: string;
  treatmentDate: string;
  submissionDate: string;
  claimAmount: string;
  cashlessRequest: boolean;
  preAuthorized: boolean;
  doctorName: string;
  doctorReg: string;
  diagnosis: string;
  consultationFee: string;
  diagnosticTests: string;
  medicinesPrescribed: string;
  testNames: string;
  documentText: string;
};

type DecisionResult = {
  decision: string;
  approved_amount: number;
  confidence_score: number;
  notes?: string;
  deductions?: Record<string, number>;
  flags?: string[];
};

type ExtractedPreview = {
  combined_text: string;
  extracted_fields?: {
    diagnosis?: string | null;
    doctor_name?: string | null;
    doctor_reg?: string | null;
    medicines_prescribed?: string[];
    tests_prescribed?: string[];
    treatment?: string | null;
    bill_summary?: Record<string, unknown>;
  };
};

const TEMPLATE_STANDARD: FormData = {
  memberId: "EMP001",
  familyId: "FAM001",
  memberName: "Rajesh Kumar",
  treatmentDate: "2024-11-01",
  submissionDate: "2024-11-10",
  claimAmount: "1500",
  cashlessRequest: false,
  preAuthorized: false,
  doctorName: "Dr. Sharma",
  doctorReg: "KA/45678/2015",
  diagnosis: "Viral fever",
  consultationFee: "1000",
  diagnosticTests: "500",
  medicinesPrescribed: "Paracetamol 650mg, Vitamin C",
  testNames: "CBC, Dengue test",
  documentText: "",
};

const PROCESSING_STEPS = [
  "Saving claim",
  "Extracting fields",
  "Checking policy rules",
  "Generating decision",
];

function buildPayload(f: FormData) {
  return {
    member_id: f.memberId,
    family_id: f.familyId || undefined,
    member_name: f.memberName,
    treatment_date: f.treatmentDate,
    submission_date: f.submissionDate,
    claim_amount: parseFloat(f.claimAmount) || 0,
    cashless_request: f.cashlessRequest,
    pre_authorized: f.preAuthorized,
    metadata: { document_text: f.documentText },
    documents: {
      prescription: {
        doctor_name: f.doctorName,
        doctor_reg: f.doctorReg,
        diagnosis: f.diagnosis,
        medicines_prescribed: f.medicinesPrescribed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
      bill: {
        consultation_fee: parseFloat(f.consultationFee) || 0,
        diagnostic_tests: parseFloat(f.diagnosticTests) || 0,
        test_names: f.testNames
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    },
  };
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.15em] text-ink/55">
      {children}
      {required && <span className="ml-1 text-clay">*</span>}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-[14px] border border-ink/10 bg-white/80 px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-ink/25 focus:bg-white"
    />
  );
}

export function ClaimForm({
  uploadedFiles,
  extractedPreview,
  onResetUploads,
}: {
  uploadedFiles: ClaimUploadFiles;
  extractedPreview: ExtractedPreview | null;
  onResetUploads: () => void;
}) {
  const [form, setForm] = useState<FormData>(TEMPLATE_STANDARD);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<DecisionResult | null>(null);
  const [claimId, setClaimId] = useState("");
  const [error, setError] = useState("");
  const lastAppliedPreview = useRef<string>("");

  function set(key: keyof FormData) {
    return (v: string | boolean) =>
      setForm((prev) => ({ ...prev, [key]: v }));
  }

  useEffect(() => {
    if (!extractedPreview?.combined_text) {
      return;
    }
    if (lastAppliedPreview.current === extractedPreview.combined_text) {
      return;
    }

    const extracted = extractedPreview.extracted_fields || {};
    const billSummary = extracted.bill_summary || {};
    const diagnosticTestsAmount =
      typeof billSummary.diagnostic_tests === "number"
        ? String(billSummary.diagnostic_tests)
        : typeof billSummary.diagnostic_tests_amount === "number"
          ? String(billSummary.diagnostic_tests_amount)
          : "";

    setForm((current) => ({
      ...current,
      doctorName: extracted.doctor_name || current.doctorName,
      doctorReg: extracted.doctor_reg || current.doctorReg,
      diagnosis: extracted.diagnosis || current.diagnosis,
      medicinesPrescribed:
        extracted.medicines_prescribed?.join(", ") || current.medicinesPrescribed,
      testNames:
        extracted.tests_prescribed?.join(", ") || current.testNames,
      consultationFee:
        typeof billSummary.consultation_fee === "number"
          ? String(billSummary.consultation_fee)
          : current.consultationFee,
      diagnosticTests: diagnosticTestsAmount || current.diagnosticTests,
      documentText: extractedPreview.combined_text,
    }));
    lastAppliedPreview.current = extractedPreview.combined_text;
  }, [extractedPreview]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const hasRequiredUploads =
      Boolean(uploadedFiles.prescription) && Boolean(uploadedFiles.medical_bill);
    if (!hasRequiredUploads) {
      setError("Upload at least the prescription and medical bill before reviewing the decision.");
      return;
    }
    setLoading(true);
    setResult(null);
    setError("");
    setClaimId("");
    setStep(0);

    try {
      const payload = buildPayload(form);
      const created = await fetch(`${API_URL}/claims/with-documents`, {
        method: "POST",
        body: buildMultipartPayload(payload, uploadedFiles),
      }).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || "Claim creation failed");
        return body;
      });

      setStep(1);
      await new Promise((r) => setTimeout(r, 450));
      setStep(2);

      const adjudicated = await fetch(
        `${API_URL}/claims/${created.claim_id}/adjudicate`,
        { method: "POST" }
      ).then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || "Adjudication failed");
        return body;
      });

      setStep(3);
      await new Promise((r) => setTimeout(r, 300));

      setClaimId(created.claim_id);
      setResult(adjudicated.decision_payload as DecisionResult);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? BACKEND_UNREACHABLE_MESSAGE
          : String(err);
      setError(message);
    } finally {
      setLoading(false);
      setStep(-1);
    }
  }

  function reset() {
    setForm(TEMPLATE_STANDARD);
    setResult(null);
    setError("");
    setClaimId("");
    lastAppliedPreview.current = "";
    onResetUploads();
  }

  return (
    <form onSubmit={onSubmit} className="panel space-y-0 overflow-hidden">
      {/* Form header */}
      <div className="border-b border-ink/8 p-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-ink/50">
          Structured intake
        </p>
        <h2 className="mt-1.5 font-display text-2xl">Claim details</h2>
        <p className="mt-2 text-sm text-ink/65">
          Required fields are marked <span className="text-clay">*</span>.
          Complete claim details improve validation quality and decision accuracy.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setForm(TEMPLATE_STANDARD)}
            disabled={loading}
            className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:bg-white/80 disabled:opacity-50"
          >
            Use sample claim
          </button>
        </div>
        <div className="mt-4 rounded-[18px] border border-plum/8 bg-white/60 px-4 py-3 text-sm text-ink/65">
          Upload the prescription and medical bill first. Extracted text and key fields will auto-fill here before submission.
        </div>
      </div>

      {/* Section 1: Member details */}
      <Section title="Member details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Member ID</Label>
            <Input
              value={form.memberId}
              onChange={set("memberId")}
              placeholder="EMP001"
              required
            />
          </div>
          <div>
            <Label required>Member name</Label>
            <Input
              value={form.memberName}
              onChange={set("memberName")}
              placeholder="Full name"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Family ID</Label>
            <Input
              value={form.familyId}
              onChange={set("familyId")}
              placeholder="Optional shared family identifier"
            />
          </div>
        </div>
      </Section>

      {/* Section 2: Treatment details */}
      <Section title="Treatment details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Treatment date</Label>
            <Input
              type="date"
              value={form.treatmentDate}
              onChange={set("treatmentDate")}
              required
            />
          </div>
          <div>
            <Label required>Submission date</Label>
            <Input
              type="date"
              value={form.submissionDate}
              onChange={set("submissionDate")}
              required
            />
          </div>
          <div>
            <Label>Diagnosis</Label>
            <Input
              value={form.diagnosis}
              onChange={set("diagnosis")}
              placeholder="e.g. Viral fever"
            />
          </div>
          <div>
            <Label>Doctor name</Label>
            <Input
              value={form.doctorName}
              onChange={set("doctorName")}
              placeholder="e.g. Dr. Sharma"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Doctor registration no.</Label>
            <Input
              value={form.doctorReg}
              onChange={set("doctorReg")}
              placeholder="e.g. KA/45678/2015"
            />
          </div>
        </div>
      </Section>

      {/* Section 3: Claim details */}
      <Section title="Claim details">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label required>Claim amount (₹)</Label>
            <Input
              type="number"
              value={form.claimAmount}
              onChange={set("claimAmount")}
              placeholder="0"
              required
            />
          </div>
          <div className="flex flex-col justify-end gap-2 pb-0.5">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.cashlessRequest}
                onChange={(e) => set("cashlessRequest")(e.target.checked)}
                className="h-4 w-4 rounded border-ink/20"
              />
              <span className="text-sm text-ink/70">Cashless request</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={form.preAuthorized}
                onChange={(e) => set("preAuthorized")(e.target.checked)}
                className="h-4 w-4 rounded border-ink/20"
              />
              <span className="text-sm text-ink/70">Pre-authorized</span>
            </label>
          </div>
        </div>
      </Section>

      {/* Section 4: Documents */}
      <Section title="Documents">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Consultation fee (₹)</Label>
            <Input
              type="number"
              value={form.consultationFee}
              onChange={set("consultationFee")}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Diagnostic tests amount (₹)</Label>
            <Input
              type="number"
              value={form.diagnosticTests}
              onChange={set("diagnosticTests")}
              placeholder="0"
            />
          </div>
          <div>
            <Label>Medicines prescribed</Label>
            <Input
              value={form.medicinesPrescribed}
              onChange={set("medicinesPrescribed")}
              placeholder="Comma-separated, e.g. Paracetamol 650mg, Vitamin C"
            />
          </div>
          <div>
            <Label>Diagnostic test names</Label>
            <Input
              value={form.testNames}
              onChange={set("testNames")}
              placeholder="Comma-separated, e.g. CBC, Dengue test"
            />
          </div>
        </div>
      </Section>

      <Section title="Risk signals">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-[18px] border border-plum/8 bg-white/60 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/45">
              Uploaded files
            </p>
            <p className="mt-2 text-sm text-ink/65">
              {Object.values(uploadedFiles).filter(Boolean).length} of 4
              document slots attached.
            </p>
          </div>
          <div className="rounded-[18px] border border-plum/8 bg-white/60 p-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/45">
              Review context
            </p>
            <p className="mt-2 text-sm text-ink/65">
              Same-day prior claims and high-value submissions can trigger
              manual review.
            </p>
          </div>
        </div>
      </Section>

      {/* Section 5: AI extraction input */}
      <Section title="Document text">
        <textarea
          value={form.documentText}
          onChange={(e) => set("documentText")(e.target.value)}
          placeholder="e.g. Dr. Reddy Reg No KA/56789/2016. Date 04/11/2024. Patient Meera Iyer…"
          className="min-h-[100px] w-full rounded-[14px] border border-ink/10 bg-white/80 px-3.5 py-2.5 text-sm outline-none placeholder:text-ink/30 focus:border-ink/25 focus:bg-white"
        />
      </Section>

      {/* Processing steps */}
      {loading && (
        <div className="border-t border-ink/8 bg-white/40 px-6 py-5">
          <p className="mb-4 text-sm text-ink/65">
            The form is locked while the claim is saved and adjudicated.
          </p>
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
            {PROCESSING_STEPS.map((s, i) => (
              <span key={s} className="flex items-center gap-2">
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    i < step
                      ? "bg-pine text-white"
                      : i === step
                        ? "bg-ink text-white animate-pulse"
                        : "bg-ink/10 text-ink/40"
                  }`}
                >
                  {i < step ? "✓" : i + 1}
                </span>
                <span
                  className={`text-xs font-medium ${
                    i === step ? "text-ink" : i < step ? "text-pine" : "text-ink/35"
                  }`}
                >
                  {s}
                </span>
                {i < PROCESSING_STEPS.length - 1 && (
                  <span className="hidden text-ink/20 lg:inline">→</span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mx-6 mb-4 rounded-[14px] border border-clay/25 bg-clay/8 px-4 py-3 text-sm text-clay">
          <span className="font-medium">Submission failed.</span> {error}
          {" "}Check API connectivity or missing claim fields and retry.
        </div>
      )}

      {/* Decision result */}
      {result && claimId && (
        <div className="border-t border-ink/8 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-ink/50">
                Adjudication complete
              </p>
              <div className="mt-1.5 flex items-center gap-3">
                <span className="font-display text-2xl">
                  {result.decision.replace(/_/g, " ")}
                </span>
                <StatusBadge status={result.decision} />
              </div>
            </div>
            <Link
              href={`/claims/${claimId}`}
              className="rounded-full border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-white/80"
            >
              View full audit trail →
            </Link>
          </div>
          <p className="mt-3 text-2xl font-semibold">
            {formatMoney(result.approved_amount)}
            <span className="ml-2 text-base font-normal text-ink/55">approved</span>
          </p>
          <div className="mt-4">
            <ConfidenceMeter score={result.confidence_score} />
          </div>
          {result.notes && (
            <p className="mt-3 text-sm leading-relaxed text-ink/65">
              {result.notes}
            </p>
          )}
          {!!result.deductions && Object.keys(result.deductions).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(result.deductions).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-full bg-sand px-3 py-1 text-sm text-ink"
                >
                  {k}: {formatMoney(v)}
                </span>
              ))}
            </div>
          )}
          {!!result.flags?.length && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.flags.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-clay/25 bg-clay/10 px-3 py-1 text-sm text-clay"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 px-6 py-4">
        <button
          type="button"
          onClick={reset}
          disabled={loading}
          className="rounded-full border border-ink/10 bg-white/80 px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-white disabled:opacity-50"
        >
          Reset form
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-55"
        >
          {loading ? "Processing…" : "Review decision"}
        </button>
      </div>
    </form>
  );
}

function buildMultipartPayload(
  payload: ReturnType<typeof buildPayload>,
  uploadedFiles: ClaimUploadFiles
) {
  const formData = new FormData();
  formData.append("payload", JSON.stringify(payload));

  Object.entries(uploadedFiles).forEach(([key, file]) => {
    if (file) {
      formData.append(key, file);
    }
  });

  return formData;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-ink/8 px-6 py-5">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink/45">
        {title}
      </p>
      {children}
    </div>
  );
}
