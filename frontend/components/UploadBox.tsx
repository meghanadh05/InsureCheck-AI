"use client";

export type ClaimUploadFiles = {
  prescription: File | null;
  medical_bill: File | null;
  diagnostic_report: File | null;
  pharmacy_bill: File | null;
};

type Props = {
  files: ClaimUploadFiles;
  resetVersion?: number;
  onFileChange: (documentType: keyof ClaimUploadFiles, file: File | null) => void;
};

const labels: Array<{
  key: keyof ClaimUploadFiles;
  title: string;
  description: string;
}> = [
  {
    key: "prescription",
    title: "Prescription",
    description: "Doctor details, diagnosis, medicines, and advised tests.",
  },
  {
    key: "medical_bill",
    title: "Medical bill",
    description: "Consultation fees, procedures, and diagnostic charges.",
  },
  {
    key: "diagnostic_report",
    title: "Diagnostic report",
    description: "Reports or result sheets that support the treatment.",
  },
  {
    key: "pharmacy_bill",
    title: "Pharmacy bill",
    description: "Medicine invoice aligned to the prescription.",
  },
];

export function UploadBox({ files, resetVersion = 0, onFileChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="soft-panel p-6">
        <p className="eyebrow">Supporting documents</p>
        <h3 className="mt-2 font-display text-xl">Upload document set</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/65">
          Attach the documents available for this claim. You can submit with a
          partial set and add more detail through the form.
        </p>
      </div>

      <div className="grid gap-4">
        {labels.map((item) => {
          const file = files[item.key];
          return (
            <label
              key={item.key}
              className="soft-panel cursor-pointer rounded-[24px] border-dashed p-5 transition hover:bg-white/60"
            >
              <input
                key={`${item.key}-${resetVersion}`}
                className="hidden"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.txt"
                onChange={(event) =>
                  onFileChange(item.key, event.target.files?.[0] ?? null)
                }
              />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-ink/60">
                    {item.description}
                  </p>
                </div>
                <div className="rounded-full bg-lavender/75 px-3 py-1 text-xs font-medium text-plum">
                  {file ? "Attached" : "Optional"}
                </div>
              </div>
              <div className="mt-4 rounded-[18px] border border-plum/8 bg-white/75 px-4 py-3">
                {file ? (
                  <div className="text-xs text-ink/65">
                    <p className="font-medium text-ink/80">{file.name}</p>
                    <p>{Math.max(1, Math.round(file.size / 1024))} KB</p>
                  </div>
                ) : (
                  <p className="text-xs text-ink/55">
                    Click to attach {item.title.toLowerCase()} file.
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
