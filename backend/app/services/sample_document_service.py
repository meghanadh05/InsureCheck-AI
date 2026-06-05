from pathlib import Path
from io import BytesIO
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from ..config import get_settings


SAMPLE_DOC_FILES = {
    "prescription": "prescription_sample.txt",
    "medical_bill": "medical_bill_sample.txt",
    "diagnostic_report": "diagnostic_report_sample.txt",
    "pharmacy_bill": "pharmacy_bill_sample.txt",
}

CASE_TYPES = ("approved", "rejected", "partial", "manual_review")

CASE_DATA = {
    "approved": {
        "patient_name": "Rajesh Kumar",
        "age_sex": "34 / Male",
        "address": "21 Lake View Enclave, Bengaluru",
        "date": "04/11/2024",
        "doctor_name": "Dr. Meera Sharma",
        "doctor_qualification": "MBBS MD",
        "doctor_reg": "KA/12345/2015",
        "doctor_ref": "Dr. Meera Sharma",
        "clinic_name": "Sunrise Family Clinic",
        "clinic_address": "12 Residency Road, Bengaluru",
        "clinic_phone": "+91-80-4411-2200",
        "diagnosis": "Viral fever",
        "chief_complaints": ["Fever for three days", "Body ache and fatigue"],
        "medicines": [
            ("Tab. Paracetamol 650mg", "1 tablet three times daily x 5 days"),
            ("Tab. Vitamin C 500mg", "1 tablet once daily x 7 days"),
        ],
        "investigations": ["Complete Blood Count (CBC)", "Dengue test"],
        "follow_up": "08/11/2024",
        "center_name": "Sunrise Diagnostics Lab",
        "accreditation": "NABL-20488",
        "report_id": "SDL-8821",
        "cbc": [("Hemoglobin", "14.5", "13-17 g/dL"), ("WBC Count", "7800", "4000-11000"), ("Platelets", "250000", "150000-450000")],
        "lft": [("SGPT", "35", "10-40 U/L"), ("SGOT", "30", "10-40 U/L")],
        "remarks": "Viral fever suspected. Correlate clinically.",
        "pathologist": "Dr. Anita Rao",
        "hospital_name": "CityCare Outpatient Centre",
        "hospital_address": "14 MG Road, Bengaluru",
        "gst_no": "29AACCC1024K1Z7",
        "bill_no": "CC-OPD-1042",
        "contact": "+91-98765-44321",
        "line_items": [
            ("Consultation Fee", 1000),
            ("CBC Test", 300),
            ("Dengue Test", 200),
            ("Medicines", 170),
        ],
        "payment_mode": "UPI",
        "transaction_id": "UPI1042BGLR",
        "pharmacy_name": "HealthPlus Pharmacy",
        "drug_license": "KA-BLR-DR-44881",
        "pharmacy_bill_no": "HP-5581",
        "pharmacy_rows": [
            ("Paracetamol 650mg", "XX123", "12/25", 10, 5, 50),
            ("Vitamin C 500mg", "YY456", "06/26", 10, 12, 120),
        ],
    },
    "rejected": {
        "patient_name": "Anita Desai",
        "age_sex": "41 / Female",
        "address": "9 Ashoka Residency, Mumbai",
        "date": "18/10/2024",
        "doctor_name": "Dr. S. Banerjee",
        "doctor_qualification": "MD Internal Medicine",
        "doctor_reg": "WB/34567/2015",
        "doctor_ref": "Dr. S. Banerjee",
        "clinic_name": "WellSpring Metabolic Clinic",
        "clinic_address": "88 Linking Road, Mumbai",
        "clinic_phone": "+91-22-4100-1188",
        "diagnosis": "Obesity - BMI 35",
        "chief_complaints": ["Difficulty with weight management", "Seeking structured diet support"],
        "medicines": [
            ("Diet counselling notes", "Lifestyle review x 30 days"),
            ("Nutrition support plan", "Follow plan once daily x 30 days"),
        ],
        "investigations": ["Body composition analysis", "Lipid Profile"],
        "follow_up": "25/10/2024",
        "center_name": "Metro Diagnostic Studio",
        "accreditation": "CAP-77104",
        "report_id": "MDS-5011",
        "cbc": [("Hemoglobin", "13.2", "12-16 g/dL"), ("WBC Count", "6900", "4000-11000"), ("Platelets", "280000", "150000-450000")],
        "lft": [("SGPT", "42", "10-40 U/L"), ("SGOT", "39", "10-40 U/L")],
        "remarks": "Weight management consultation advised.",
        "pathologist": "Dr. Reema Patel",
        "hospital_name": "Prime Wellness Clinic",
        "hospital_address": "5 Carter Road, Mumbai",
        "gst_no": "27AAECP1024K1Z1",
        "bill_no": "PWC-2180",
        "contact": "+91-98200-11887",
        "line_items": [
            ("Consultation Fee", 3000),
            ("Diet Plan", 5000),
        ],
        "payment_mode": "Card",
        "transaction_id": "CARD2180MUM",
        "pharmacy_name": "WellLife Pharmacy",
        "drug_license": "MH-MUM-DR-33120",
        "pharmacy_bill_no": "WL-8810",
        "pharmacy_rows": [
            ("Nutrition Supplement", "NS101", "08/26", 2, 900, 1800),
            ("Fiber Support Mix", "FS223", "10/25", 2, 650, 1300),
        ],
    },
    "partial": {
        "patient_name": "Priya Singh",
        "age_sex": "29 / Female",
        "address": "17 Green Park, Pune",
        "date": "15/10/2024",
        "doctor_name": "Dr. A. Patel",
        "doctor_qualification": "BDS MDS",
        "doctor_reg": "MH/67890/2018",
        "doctor_ref": "Dr. A. Patel",
        "clinic_name": "Pearl Dental Studio",
        "clinic_address": "6 FC Road, Pune",
        "clinic_phone": "+91-20-4499-1144",
        "diagnosis": "Tooth decay requiring root canal",
        "chief_complaints": ["Pain in lower molar", "Sensitivity to cold drinks"],
        "medicines": [
            ("Root canal treatment", "Procedure session x 1"),
            ("Teeth whitening", "Cosmetic add-on x 1"),
        ],
        "investigations": ["Dental X-Ray"],
        "follow_up": "22/10/2024",
        "center_name": "CareScan Dental Imaging",
        "accreditation": "NABL-44190",
        "report_id": "CSDI-1440",
        "cbc": [("Hemoglobin", "13.8", "12-16 g/dL"), ("WBC Count", "7200", "4000-11000"), ("Platelets", "265000", "150000-450000")],
        "lft": [("SGPT", "28", "10-40 U/L"), ("SGOT", "24", "10-40 U/L")],
        "remarks": "Dental imaging supports endodontic treatment.",
        "pathologist": "Dr. Kavya Menon",
        "hospital_name": "Pearl Dental Studio",
        "hospital_address": "6 FC Road, Pune",
        "gst_no": "27AACPD9941M1Z7",
        "bill_no": "PDS-7012",
        "contact": "+91-97654-22190",
        "line_items": [
            ("Root Canal", 8000),
            ("Teeth Whitening", 4000),
        ],
        "payment_mode": "Cash",
        "transaction_id": "CASH7012PUN",
        "pharmacy_name": "DentalCare Pharmacy",
        "drug_license": "MH-PUN-DR-22190",
        "pharmacy_bill_no": "DC-2104",
        "pharmacy_rows": [
            ("Pain Relief Gel", "PR332", "04/26", 1, 220, 220),
            ("Antibiotic 500mg", "AB440", "11/25", 10, 18, 180),
        ],
    },
    "manual_review": {
        "patient_name": "Ravi Menon",
        "age_sex": "38 / Male",
        "address": "44 Lakeside Towers, Kochi",
        "date": "30/10/2024",
        "doctor_name": "Dr. F. Khan",
        "doctor_qualification": "MD Neurology",
        "doctor_reg": "DL/34567/2020",
        "doctor_ref": "Dr. F. Khan",
        "clinic_name": "NeuroCare Clinic",
        "clinic_address": "12 Marine Drive, Kochi",
        "clinic_phone": "+91-484-4100-6200",
        "diagnosis": "Migraine",
        "chief_complaints": ["Recurring headache", "Light sensitivity and nausea"],
        "medicines": [
            ("Tab. Sumatriptan 50mg", "1 tablet during migraine episode x 5 days"),
            ("Tab. Propranolol 20mg", "1 tablet twice daily x 10 days"),
        ],
        "investigations": ["Neurology review", "Blood Pressure Monitoring"],
        "follow_up": "02/11/2024",
        "center_name": "Coastal Diagnostic Hub",
        "accreditation": "NABL-90871",
        "report_id": "CDH-9902",
        "cbc": [("Hemoglobin", "14.1", "13-17 g/dL"), ("WBC Count", "7600", "4000-11000"), ("Platelets", "248000", "150000-450000")],
        "lft": [("SGPT", "31", "10-40 U/L"), ("SGOT", "29", "10-40 U/L")],
        "remarks": "Clinical correlation advised due to repeat same-day visits.",
        "pathologist": "Dr. Nikhil Varma",
        "hospital_name": "NeuroCare Clinic",
        "hospital_address": "12 Marine Drive, Kochi",
        "gst_no": "32AACCN1188M1Z9",
        "bill_no": "NC-4842",
        "contact": "+91-98955-44120",
        "line_items": [
            ("Consultation Fee", 2000),
            ("Medicines", 2800),
        ],
        "payment_mode": "UPI",
        "transaction_id": "UPI4842COK",
        "pharmacy_name": "Coastal Medicos",
        "drug_license": "KL-COK-DR-77881",
        "pharmacy_bill_no": "CM-4819",
        "pharmacy_rows": [
            ("Sumatriptan 50mg", "SM550", "03/26", 5, 120, 600),
            ("Propranolol 20mg", "PP221", "09/26", 20, 35, 700),
            ("Antacid Syrup", "AS101", "01/26", 1, 140, 140),
        ],
    },
}


def sample_documents_dir() -> Path:
    return get_settings().data_dir / "sample_documents"


def list_sample_documents() -> list[dict[str, Any]]:
    return [
        {
            "document_type": document_type,
            "filename": filename,
            "supported_case_types": list(CASE_TYPES),
        }
        for document_type, filename in SAMPLE_DOC_FILES.items()
    ]


def sample_document_path(document_type: str) -> Path:
    if document_type not in SAMPLE_DOC_FILES:
        raise KeyError(document_type)
    return sample_documents_dir() / SAMPLE_DOC_FILES[document_type]


def _format_currency(amount: int) -> str:
    return f"Rs {amount}"


def _render_prescription(data: dict[str, Any]) -> str:
    complaints = "\n".join(f"- {item}" for item in data["chief_complaints"])
    medicines = "\n".join(
        f"{index}. {name}\n   {dosage}"
        for index, (name, dosage) in enumerate(data["medicines"], start=1)
    )
    investigations = "\n".join(f"- {item}" for item in data["investigations"])
    return f"""--------------------------------
{data["clinic_name"]}
{data["doctor_name"]}, {data["doctor_qualification"]}
Reg. No: {data["doctor_reg"]}
{data["clinic_address"]}
Phone: {data["clinic_phone"]}
--------------------------------
Date: {data["date"]}

Patient Name: {data["patient_name"]}
Age/Sex: {data["age_sex"]}
Address: {data["address"]}

Chief Complaints:
{complaints}

Diagnosis:
{data["diagnosis"]}

Rx (Prescription):
{medicines}

Investigations Advised:
{investigations}

Follow-up: {data["follow_up"]}

{data["doctor_name"]}
Digital Signature / Clinic Stamp
--------------------------------"""


def _render_medical_bill(data: dict[str, Any]) -> str:
    lines = "\n".join(
        f"{label:<28}{_format_currency(amount)}"
        for label, amount in data["line_items"]
    )
    subtotal = sum(amount for _, amount in data["line_items"])
    gst = round(subtotal * 0.18)
    total = subtotal + gst
    return f"""--------------------------------
{data["hospital_name"]}
{data["hospital_address"]}
GST No: {data["gst_no"]}
--------------------------------
Bill No: {data["bill_no"]}        Date: {data["date"]}

Patient Details:
Name: {data["patient_name"]}
Contact: {data["contact"]}
Ref. By: {data["doctor_ref"]}

PARTICULARS               AMOUNT
--------------------------------
{lines}
--------------------------------
Sub Total:                {_format_currency(subtotal)}
GST (18%):                {_format_currency(gst)}
--------------------------------
TOTAL:                    {_format_currency(total)}
Amount in Words: Billing amount as per itemized charges

Payment Mode: {data["payment_mode"]}
Transaction ID: {data["transaction_id"]}

Authorized Signatory
Billing Desk Stamp
--------------------------------"""


def _render_diagnostic_report(data: dict[str, Any]) -> str:
    cbc = "\n".join(f"{name:<25}{result:<12}{normal}" for name, result, normal in data["cbc"])
    lft = "\n".join(f"{name:<25}{result:<12}{normal}" for name, result, normal in data["lft"])
    return f"""--------------------------------
{data["center_name"]}
NABL Accreditation No: {data["accreditation"]}
--------------------------------
Patient Name: {data["patient_name"]}
Age/Sex: {data["age_sex"]}
Ref. By: {data["doctor_ref"]}
Date: {data["date"]}
Report ID: {data["report_id"]}

TEST NAME                 RESULT      NORMAL RANGE
-----------------------------------------------
COMPLETE BLOOD COUNT (CBC)
{cbc}

LIVER FUNCTION TEST
{lft}

Remarks: {data["remarks"]}
Pathologist: {data["pathologist"]}
Digital Signature Verified
--------------------------------"""


def _render_pharmacy_bill(data: dict[str, Any]) -> str:
    rows = "\n".join(
        f"{index:<4} | {name:<18} | {batch:<5} | {exp:<5} | {qty:<3} | {mrp:<4} | {amount}"
        for index, (name, batch, exp, qty, mrp, amount) in enumerate(data["pharmacy_rows"], start=1)
    )
    total = sum(amount for _, _, _, _, _, amount in data["pharmacy_rows"])
    gst = round(total * 0.18)
    net = total + gst
    return f"""--------------------------------
{data["pharmacy_name"]}
Drug License No: {data["drug_license"]}
GST No: {data["gst_no"]}
--------------------------------
Bill No: {data["pharmacy_bill_no"]}    Date: {data["date"]}

Patient: {data["patient_name"]}
Doctor: {data["doctor_ref"]}

S.No | Medicine Name      | Batch | Exp   | Qty | MRP | Amount
---------------------------------------------------------------
{rows}

                           Total: {_format_currency(total)}
                           GST: {_format_currency(gst)}
                           Net Amount: {_format_currency(net)}

Pharmacist Signature
Store Stamp
--------------------------------"""


RENDERERS = {
    "prescription": _render_prescription,
    "medical_bill": _render_medical_bill,
    "diagnostic_report": _render_diagnostic_report,
    "pharmacy_bill": _render_pharmacy_bill,
}


def get_sample_document(document_type: str) -> dict[str, Any]:
    path = sample_document_path(document_type)
    return {
        "document_type": document_type,
        "filename": path.name,
        "preview_text": path.read_text(encoding="utf-8"),
        "download_url": f"{get_settings().api_prefix}/sample-documents/{document_type}/download",
        "supported_case_types": list(CASE_TYPES),
    }


def generate_sample_document(document_type: str, case_type: str) -> dict[str, Any]:
    if document_type not in RENDERERS:
        raise KeyError(document_type)
    if case_type not in CASE_DATA:
        raise KeyError(case_type)

    preview_text = RENDERERS[document_type](CASE_DATA[case_type])
    return {
        "document_type": document_type,
        "case_type": case_type,
        "filename": f"{document_type}_{case_type}.txt",
        "preview_text": preview_text,
        "download_url": f"{get_settings().api_prefix}/sample-documents/{document_type}/download",
        "supported_case_types": list(CASE_TYPES),
    }


def get_download_payload(
    document_type: str, case_type: str | None = None, output_format: str = "txt"
) -> tuple[str, bytes, str]:
    if case_type:
        sample = generate_sample_document(document_type, case_type)
        preview_text = sample["preview_text"]
        filename_base = f"{document_type}_{case_type}"
    else:
        sample = get_sample_document(document_type)
        preview_text = sample["preview_text"]
        filename_base = Path(sample["filename"]).stem

    if output_format == "pdf":
        return (
            f"{filename_base}.pdf",
            render_pdf_bytes(preview_text, document_type, case_type),
            "application/pdf",
        )

    return (
        f"{filename_base}.txt",
        preview_text.encode("utf-8"),
        "text/plain; charset=utf-8",
    )


def render_pdf_bytes(preview_text: str, document_type: str, case_type: str | None) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    title = document_type.replace("_", " ").title()
    subtitle = (
        f"Scenario: {case_type.replace('_', ' ').title()}"
        if case_type
        else "Base template"
    )

    y = height - 48
    pdf.setTitle(title)
    pdf.setFont("Helvetica-Bold", 16)
    pdf.drawString(48, y, title)
    y -= 18
    pdf.setFont("Helvetica", 10)
    pdf.drawString(48, y, subtitle)
    y -= 24
    pdf.setFont("Courier", 9)

    for raw_line in preview_text.splitlines():
        line = raw_line or " "
        chunks = [line[i : i + 95] for i in range(0, len(line), 95)] or [" "]
        for chunk in chunks:
            if y < 48:
                pdf.showPage()
                y = height - 48
                pdf.setFont("Courier", 9)
            pdf.drawString(48, y, chunk)
            y -= 12

    pdf.save()
    return buffer.getvalue()
