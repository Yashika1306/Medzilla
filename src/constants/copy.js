export const COPY = {
  appName: 'Medzilla',
  tagline: 'Your medical bill, explained',
  heroTitle: 'That bill does not have to be paid.',
  heroSubtitle: 'Upload your hospital bill. We find every legal path to reduce or eliminate it — charity care, dispute, negotiate, and more. Free. Private. Nothing leaves your device.',

  uploadPrompt: 'Drop your hospital bill PDF here, or click to select',
  uploadHint: 'Your file stays on your device. Nothing is uploaded.',
  uploadError: 'Could not extract text from this file. If it\'s a scanned/photo bill, the text is embedded as an image and cannot be read automatically. Try typing the key amounts and codes below.',
  uploadSuccess: 'Bill loaded. Analyzing charges...',

  noChargesFound: 'No CPT or ICD-10 codes were detected in this document. Make sure this is a hospital itemized bill, not an Explanation of Benefits (EOB).',

  flagLabels: {
    often_disputed: 'Likely Error',
    questionable: 'Worth Challenging',
    normal: 'Appears Correct'
  },
  flagColors: {
    often_disputed: 'red',
    questionable: 'amber',
    normal: 'green'
  },

  paths: {
    charity_care: 'Charity Care / Financial Assistance',
    dispute: 'Dispute Overbilling',
    negotiate: 'Negotiate the Balance',
    hardship: 'Financial Hardship Discount',
    credit_protection: 'Credit Report Protections',
    payment_plan: 'Interest-Free Payment Plan',
    patient_advocate: 'Free Patient Advocate',
    state_programs: 'State-Specific Programs',
    no_surprises_act: 'No Surprises Act Protection'
  },

  actionPlanHeader: 'YOUR ACTION PLAN — Do these in order before paying anything',
  doNotPay: 'Do NOT pay anything until you complete Steps 1–3. Paying validates the charges and surrenders your negotiating position.',

  chatPlaceholder: 'Ask about your bill... e.g. "What is 99285?" or "Why was I charged for blood tests?"',
  chatDisclaimer: 'Responses are based on your uploaded bill and US patient rights information. This is not legal advice.',

  letterIntro: 'These letters are generated from your bill data. Fill in your personal details, then print or copy to send.',
}
