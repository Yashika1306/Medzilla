import { useState } from 'react'
import { generateVerificationId, runVerificationChecks } from '../utils/verificationEngine'

const LEVEL_STYLE = {
  'Fully Verified':      { bg: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-800', seal: 'border-emerald-500 text-emerald-700', badge: 'bg-emerald-600' },
  'Verified':            { bg: 'bg-green-50',   border: 'border-green-400',   text: 'text-green-800',   seal: 'border-green-500 text-green-700',   badge: 'bg-green-600' },
  'Partially Verified':  { bg: 'bg-amber-50',   border: 'border-amber-400',   text: 'text-amber-800',   seal: 'border-amber-500 text-amber-700',   badge: 'bg-amber-500' },
  'Needs Attention':     { bg: 'bg-red-50',     border: 'border-red-400',     text: 'text-red-800',     seal: 'border-red-500 text-red-700',       badge: 'bg-red-500' },
}

const LETTER_NAMES = {
  itemizedBillRequest: 'Itemized Bill Request',
  charityCareLetter: 'Charity Care Application Request',
  disputeLetter: 'Charge Dispute Letter',
  negotiationLetter: 'Negotiation / Settlement Offer',
  hardshipLetter: 'Financial Hardship Letter',
  paymentPlanLetter: 'Payment Plan Request',
  noSurprisesLetter: 'No Surprises Act Dispute',
  patientAdvocateLetter: 'Patient Advocate Request',
}

export default function VerificationCertificate({ bill, letterKey, letterText }) {
  const [revealed, setRevealed] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const verificationId = generateVerificationId(bill, letterKey)
  const result = revealed ? runVerificationChecks(bill, letterText, letterKey) : null
  const style = result ? (LEVEL_STYLE[result.verificationLevel] ?? LEVEL_STYLE['Verified']) : null

  function printCertificate() {
    const win = window.open('', '_blank')
    if (!win) {
      alert('Popup blocked. Please allow popups for this page, then try again.')
      return
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medzilla Verification Certificate — ${verificationId}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Georgia', serif; background: white; color: #1e293b; }
          .page { max-width: 680px; margin: 48px auto; padding: 40px; border: 2px solid #334155; }
          .header { text-align: center; border-bottom: 1px solid #94a3b8; padding-bottom: 20px; margin-bottom: 24px; }
          .seal { display: inline-block; border: 3px double #1e40af; border-radius: 50%; width: 80px; height: 80px; line-height: 80px; font-size: 36px; margin-bottom: 12px; }
          h1 { font-size: 20px; letter-spacing: 2px; text-transform: uppercase; color: #1e293b; }
          h2 { font-size: 13px; color: #475569; font-weight: normal; margin-top: 4px; letter-spacing: 1px; }
          .id-block { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 12px 20px; text-align: center; margin: 20px 0; }
          .id { font-family: monospace; font-size: 22px; font-weight: bold; letter-spacing: 3px; color: #1e40af; }
          .id-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
          .section { margin: 20px 0; }
          .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 12px; }
          .check { display: flex; gap: 10px; margin: 8px 0; align-items: flex-start; }
          .check-icon { font-size: 13px; flex-shrink: 0; margin-top: 1px; }
          .check-text { font-size: 13px; line-height: 1.5; }
          .check-detail { font-size: 11px; color: #64748b; margin-top: 2px; }
          .level-badge { display: inline-block; background: #1e40af; color: white; padding: 4px 14px; border-radius: 20px; font-size: 13px; font-weight: bold; letter-spacing: 1px; }
          .summary { background: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.7; }
          .footer { text-align: center; margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; }
          .score { font-size: 32px; font-weight: bold; color: #1e40af; }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="seal">⚖️</div>
            <h1>Medzilla Document Verification</h1>
            <h2>Independent Rule-Based Legal Document Review</h2>
          </div>

          <div class="id-block">
            <div class="id">${verificationId}</div>
            <div class="id-label">Verification ID</div>
          </div>

          <div class="section">
            <h3>Document Information</h3>
            <table style="width:100%;font-size:13px;border-collapse:collapse;">
              <tr><td style="padding:4px 0;color:#64748b;width:160px">Document Type</td><td style="padding:4px 0;font-weight:600">${LETTER_NAMES[letterKey] ?? letterKey}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Provider</td><td style="padding:4px 0;font-weight:600">${result.billSummary.hospital}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Balance Disputed</td><td style="padding:4px 0;font-weight:600">${result.billSummary.balance ? '$' + result.billSummary.balance.toLocaleString() : 'Not specified'}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Charges Reviewed</td><td style="padding:4px 0;font-weight:600">${result.billSummary.codes.join(', ')}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Flagged Charges</td><td style="padding:4px 0;font-weight:600">${result.billSummary.flaggedCount}</td></tr>
              <tr><td style="padding:4px 0;color:#64748b">Verified At</td><td style="padding:4px 0;font-weight:600">${result.verifiedAt}</td></tr>
            </table>
          </div>

          <div class="section">
            <h3>Verification Result</h3>
            <div style="display:flex;align-items:center;gap:16px;margin:8px 0">
              <div class="score">${result.score}%</div>
              <div>
                <span class="level-badge">${result.verificationLevel}</span>
                <div style="font-size:12px;color:#64748b;margin-top:4px">${result.passed} of ${result.total} checks passed</div>
              </div>
            </div>
          </div>

          ${result.categories.map(cat => {
            const catChecks = result.checks.filter(c => c.category === cat)
            return `
            <div class="section">
              <h3>${cat}</h3>
              ${catChecks.map(c => `
                <div class="check">
                  <span class="check-icon">${c.passed ? '✓' : '✗'}</span>
                  <div>
                    <div class="check-text" style="color:${c.passed ? '#166534' : '#991b1b'}">${c.label}</div>
                    <div class="check-detail">${c.detail}</div>
                  </div>
                </div>
              `).join('')}
            </div>`
          }).join('')}

          <div class="summary">
            This document was generated by Medzilla using bill data uploaded directly by the patient and verified against the CMS 2024 CPT code database, the Medicare Physician Fee Schedule, and applicable federal billing regulations including 42 U.S.C. § 1395y(a)(1)(A), ACA Section 501(r), and the No Surprises Act (42 U.S.C. § 300gg-111). All flagging rules are derived from publicly available CMS Correct Coding Initiative guidelines.
          </div>

          <div class="footer">
            Medzilla — medzilla.app &nbsp;|&nbsp; Verification ID: ${verificationId} &nbsp;|&nbsp; This certificate is generated client-side. No data was transmitted.
          </div>
        </div>
      </body>
      </html>
    `)
    win.document.close()
    win.print()
  }

  return (
    <div className="mt-4 space-y-3">
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 hover:bg-violet-100 hover:border-violet-400 transition-colors py-4 text-violet-700 font-semibold text-sm"
        >
          <span className="text-lg">⚖️</span>
          Verify & Certify This Document
        </button>
      ) : (
        <div className={`rounded-xl border-2 overflow-hidden ${style.border} ${style.bg}`}>
          {/* Certificate header */}
          <div className="p-5 border-b border-slate-200 bg-white">
            <div className="flex items-center gap-4">
              {/* Seal */}
              <div className={`w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center shrink-0 ${style.seal} border-double`}>
                <span className="text-2xl">⚖️</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Medzilla Document Verification</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-sm font-bold px-3 py-0.5 rounded-full text-white ${style.badge}`}>
                    {result.verificationLevel}
                  </span>
                  <span className="text-xl font-bold text-slate-800">{result.score}%</span>
                  <span className="text-xs text-slate-500">{result.passed}/{result.total} checks passed</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-slate-400">Verification ID</p>
                <p className="font-mono text-sm font-bold text-slate-700 tracking-wider">{verificationId}</p>
                <p className="text-xs text-slate-400 mt-0.5">{result.verifiedAt}</p>
              </div>
            </div>
          </div>

          {/* Score bar */}
          <div className="px-5 py-3 bg-white/60">
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${result.score >= 90 ? 'bg-emerald-500' : result.score >= 75 ? 'bg-green-500' : result.score >= 55 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${result.score}%` }}
              />
            </div>
          </div>

          {/* Checks by category */}
          <div className="p-5 space-y-4">
            {result.categories.map(cat => {
              const catChecks = result.checks.filter(c => c.category === cat)
              const catPassed = catChecks.filter(c => c.passed).length
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cat}</p>
                    <span className="text-xs text-slate-400">{catPassed}/{catChecks.length}</span>
                  </div>
                  <div className="space-y-2">
                    {catChecks.map(check => (
                      <div key={check.id} className="flex items-start gap-2">
                        <span className={`mt-0.5 shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${check.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {check.passed ? '✓' : '✗'}
                        </span>
                        <div>
                          <p className={`text-xs font-medium ${check.passed ? 'text-slate-700' : 'text-red-700'}`}>{check.label}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Statement */}
          <div className="px-5 pb-4">
            <div className="rounded-lg bg-white border border-slate-200 p-4 text-xs text-slate-500 leading-relaxed">
              <strong className="text-slate-700">Verification Statement:</strong> This document was generated by Medzilla using bill data uploaded directly by the patient and verified against the CMS 2024 CPT code database and Medicare Physician Fee Schedule. All flagging rules are derived from publicly available CMS Correct Coding Initiative guidelines and applicable federal billing regulations.
            </div>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center gap-3 flex-wrap">
            <button
              onClick={printCertificate}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <span>🖨️</span> Print Certificate
            </button>
            <button
              onClick={() => setShowDetails(v => !v)}
              className="btn-secondary text-sm"
            >
              {showDetails ? 'Hide details' : 'Full report'}
            </button>
            <span className="text-xs text-slate-400 ml-auto">ID: {verificationId}</span>
          </div>

          {/* Full report expansion */}
          {showDetails && (
            <div className="border-t border-slate-200 bg-slate-50 p-5 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-700">What this verification confirms:</p>
              <ul className="space-y-1">
                <li>• The charges listed were extracted from an actual hospital bill PDF uploaded by the patient.</li>
                <li>• CPT codes were matched against the CMS 2024 outpatient code reference database.</li>
                <li>• Medicare allowed amounts are from the CMS 2024 Physician Fee Schedule (national averages).</li>
                <li>• Flags are based on the CMS Correct Coding Initiative (CCI) and known overbilling patterns published in peer-reviewed billing audits.</li>
                <li>• Legal citations in the letter reference currently applicable federal statutes (42 U.S.C., ACA, No Surprises Act).</li>
                <li>• No data was transmitted outside the browser. Verification is entirely client-side.</li>
              </ul>
              <p className="text-slate-400 mt-3">This is a rule-based document review tool, not legal advice. The verification confirms document completeness and legal grounding — not outcomes.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
