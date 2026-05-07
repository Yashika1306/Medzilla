const BLOOD_PANEL_CODES = new Set([
  '80047','80048','80050','80051','80053','80055','80061','80069','80074','80076',
  '85002','85004','85007','85008','85009','85013','85014','85018','85025','85027',
  '85044','85045','85048','85049','85060','85097','85210','85240','85250','85260',
  '85270','85280','85291','85292','85293','85300','85301','85302','85303','85305',
  '85306','85307','85335','85337','85345','85347','85348','85360','85362','85366',
  '85370','85378','85379','85380','85382','85384','85385','85390','85396','85400',
  '85410','85415','85420','85421','85441','85445','85460','85461','85475','85520',
  '85525','85530','85536','85540','85547','85549','85555','85557','85576','85597',
  '85598','85610','85611','85612','85613','85635','85651','85652','85660','85670',
  '85675','85705','85730','85732','85810','86850','86860','86870','86880','86885',
  '86886','86890','86891','86900','86901','86902','86903','86904','86905','86906',
  '86920','86921','86922','86923','86927','86930','86931','86932','86940','86941',
  '86945','86950','86960','86965','86970','86971','86972','86975','86976','86977',
  '86978','86985','86999'
])

export function matchChat(query, bill) {
  if (!bill || !query.trim()) return null

  const q = query.toLowerCase()
  const { lineItems = [], totals, hospitalName, flagSummary } = bill

  // ── BLOOD TESTS ────────────────────────────────────────────────────────────
  if (/blood|multiple blood|blood test|blood panel|lab panel/i.test(q)) {
    const panels = lineItems.filter(i =>
      BLOOD_PANEL_CODES.has(i.code) ||
      /panel|cbc|metabolic|hematology|coagul/i.test(i.plainEnglish ?? '')
    )
    if (panels.length === 0) {
      const labItems = lineItems.filter(i => /lab|blood|panel/i.test(i.plainEnglish ?? ''))
      if (labItems.length === 0) return 'No blood panel charges were found on your bill.'
      const total = labItems.reduce((s, i) => s + (i.amount ?? 0), 0)
      return `Your bill includes ${labItems.length} lab charge${labItems.length !== 1 ? 's' : ''}: ${labItems.map(i => i.code).join(', ')}. Total: $${total.toLocaleString()}.`
    }
    const total = panels.reduce((s, i) => s + (i.amount ?? 0), 0)
    const codeList = panels.map(i => i.code).join(', ')
    return `Your bill includes ${panels.length} blood panel${panels.length !== 1 ? 's' : ''}: ${codeList}.\n\nFor a trauma or injury visit, ordering ${panels.length}+ simultaneous panels is a known overbilling pattern that violates CMS Correct Coding Initiative rules. You can request medical necessity documentation for each one — at minimum, one panel should be removable.\n\nThis could save you $${total.toLocaleString()}.`
  }

  // ── DISPUTE ────────────────────────────────────────────────────────────────
  if (/disput|can i disput|wrong|incorrect|error|challenge/i.test(q)) {
    const flagged = lineItems.filter(i => i.flag !== 'normal')
    if (flagged.length === 0) {
      return 'No charges were automatically flagged on your bill. You can still request an itemized bill in writing — this is your legal right — and review each charge manually before paying anything.'
    }
    const flaggedTotal = flagged.reduce((s, i) => s + (i.amount ?? 0), 0)
    return `Yes. Your bill has ${flagged.length} flagged charge${flagged.length !== 1 ? 's' : ''} worth $${flaggedTotal.toLocaleString()}.\n\nStart by requesting an itemized bill in writing — this is your legal right. Then dispute the flagged charges using the pre-written letters in the Letters tab.\n\nDo not pay anything until you have done this.`
  }

  // ── 99285 SPECIFICALLY ────────────────────────────────────────────────────
  if (/99285|highest.*er|er.*highest|highest.*emergency/i.test(q)) {
    const item = lineItems.find(i => i.code === '99285')
    const amtStr = item?.amount ? ` charged at $${item.amount.toLocaleString()}` : ''
    return `Code 99285 is the highest-tier emergency room visit code${amtStr}. It is one of the most disputed charges in medical billing — hospitals often apply it automatically regardless of actual complexity.\n\nYou can write to billing asking them to justify the complexity level and request a downgrade to 99284 or 99283, which could save you hundreds of dollars. Use the Dispute Letter in the Letters tab.`
  }

  // ── ANY SPECIFIC CODE ─────────────────────────────────────────────────────
  const codeMatch = q.match(/\b(9[90]\d{3}|[78]\d{4}|[A-Z]\d{2}(?:\.\d+)?|[A-Z]\d{4})\b/i)
  if (codeMatch) {
    const code = codeMatch[1].toUpperCase()
    const item = lineItems?.find(i => i.code.toUpperCase() === code)
    if (item) {
      let r = `Code ${item.code}: ${item.plainEnglish ?? 'Unknown service'}.`
      if (item.amount) r += ` Billed amount: $${item.amount.toLocaleString()}.`
      if (item.flag === 'often_disputed') r += `\n\nThis charge is often disputed. ${item.flagReason ?? ''} Use the Dispute Letter in the Letters tab.`
      else if (item.flag === 'questionable') r += `\n\nThis charge is questionable. ${item.flagReason ?? ''} Consider requesting documentation before paying.`
      else r += ' This charge appears normal for its context.'
      return r
    }
    return `Code ${code} was not found on your bill. It may have been listed in a different format or excluded from your EOB.`
  }

  // ── NEGOTIATE ─────────────────────────────────────────────────────────────
  if (/negotiat|offer|settle|lump.sum/i.test(q)) {
    if (totals?.patientOwes) {
      const offer = Math.round(totals.patientOwes * 0.45)
      return `Hospitals negotiate more than most people realize. The amount on your bill is a starting position, not a fixed price.\n\nYou can offer a lump-sum settlement at 40–50% of your balance. On a $${totals.patientOwes.toLocaleString()} balance, that means offering around $${offer.toLocaleString()}.\n\nUse the Negotiation Letter in the Letters tab — it's already written for you.`
    }
    return 'Hospitals routinely accept 40–60% of patient balances in lump-sum settlements. Use the Negotiation Letter in the Letters tab — it\'s already written for you.'
  }

  // ── CHARITY CARE ──────────────────────────────────────────────────────────
  if (/charity|financial assist|free care|forgiv|hardship/i.test(q)) {
    const hospital = hospitalName ?? 'your hospital'
    return `Every nonprofit hospital in the US is legally required by the IRS to offer free or reduced-cost care to low-income patients. This is called Charity Care or Financial Assistance.\n\nInternational students on stipends or part-time income often qualify for 50–100% forgiveness. You have to apply — hospitals almost never advertise this.\n\nUse the Charity Care letter in the Letters tab to request an application from ${hospital}.`
  }

  // ── DO I HAVE TO PAY NOW ──────────────────────────────────────────────────
  if (/do i have to pay|right now|must i pay|have to pay|when.*pay|pay.*now|payment plan|rush|urgent/i.test(q)) {
    return `No — not yet.\n\nBefore paying anything:\n1) Request an itemized bill (your legal right)\n2) Apply for charity care at your hospital\n3) Dispute any flagged charges\n\nPaying immediately gives up your negotiating position and validates all the charges as correct.\n\nYou have at least 180 days before medical debt can be reported to credit bureaus. Medical debt under $500 is no longer reported at all.`
  }

  // ── BALANCE / WHAT DO I OWE ───────────────────────────────────────────────
  if (/what.*(owe|balance|due|total)|how much/i.test(q)) {
    if (totals?.patientOwes) {
      return `Your current balance is $${totals.patientOwes.toLocaleString()}. Before paying this, review your flagged charges and consider applying for charity care — there are likely paths to reduce or eliminate this amount.`
    }
    return 'I could not find a balance due on your bill. Look for "Patient Responsibility", "Your Share", or "Amount Due" on the document — or enter it manually in the stats section above.'
  }

  // ── HOSPITAL ──────────────────────────────────────────────────────────────
  if (/hospital|provider|where|who billed/i.test(q)) {
    return hospitalName
      ? `The hospital/provider on your bill appears to be: ${hospitalName}.`
      : 'I could not identify the hospital name from the bill. It may be on a header that was not extracted. Check the top of your original document.'
  }

  // ── FLAGS ─────────────────────────────────────────────────────────────────
  if (/flag|how many.*flag|disput.*charge|problem|issue/i.test(q)) {
    const disputed = flagSummary?.often_disputed ?? 0
    const questionable = flagSummary?.questionable ?? 0
    if (disputed + questionable === 0) return 'No charges were flagged on your bill. That does not mean all charges are correct — it means none matched our dispute patterns. You can still request an itemized bill and review manually.'
    return `Your bill has ${disputed} often-disputed charge${disputed !== 1 ? 's' : ''} and ${questionable} questionable charge${questionable !== 1 ? 's' : ''}. These are the ones to focus on first — see the Charges tab for details.`
  }

  // ── NO SURPRISES ACT ──────────────────────────────────────────────────────
  if (/no surprises|surprise bill|out.of.network|balance bill/i.test(q)) {
    return 'The No Surprises Act (effective 2022) protects patients from surprise bills for emergency care. If you had insurance and received emergency care, out-of-network providers cannot bill you more than your in-network cost-sharing amount. Use the No Surprises Act letter in the Letters tab if this applies to your situation.'
  }

  // ── FALLBACK ──────────────────────────────────────────────────────────────
  return null
}
