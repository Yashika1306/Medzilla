// To enable correction logging:
// 1. Go to forms.google.com → New Form
// 2. Add two Short Answer questions:
//    Q1: "What does your bill say?" (for the corrected amount)
//    Q2: "Who is your insurer?"
// 3. Click Send → get prefill link → inspect source for entry.XXXXXXXXX IDs
// 4. Set GOOGLE_FORM_URL to: https://docs.google.com/forms/d/YOUR_FORM_ID/formResponse
// 5. Fill in the two entry IDs below.
// Leave these blank to disable logging without breaking anything.

export const GOOGLE_FORM_URL = ''
export const FORM_FIELD_AMOUNT = ''   // e.g. 'entry.1234567890'
export const FORM_FIELD_INSURER = ''  // e.g. 'entry.9876543210'
export const FORM_FIELD_LABEL = ''    // optional: 'entry.1111111111' — which stat was corrected

export function submitCorrection(label, amount, insurer) {
  if (!GOOGLE_FORM_URL || !FORM_FIELD_AMOUNT) return
  try {
    const fd = new FormData()
    fd.append(FORM_FIELD_AMOUNT, String(amount))
    fd.append(FORM_FIELD_INSURER, insurer || 'Not specified')
    if (FORM_FIELD_LABEL) fd.append(FORM_FIELD_LABEL, label)
    fetch(GOOGLE_FORM_URL, { method: 'POST', body: fd, mode: 'no-cors' }).catch(() => {})
  } catch {}
}

export const INSURERS = [
  'Aetna',
  'Blue Cross Blue Shield (BCBS)',
  'Cigna',
  'Humana',
  'Kaiser Permanente',
  'UnitedHealthcare (UHC)',
  'Anthem',
  'Medicare',
  'Medicaid',
  'Other',
]
