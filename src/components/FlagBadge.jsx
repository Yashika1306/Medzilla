import { COPY } from '../constants/copy'

const STYLES = {
  often_disputed: 'bg-red-100 text-red-800 border-red-200',
  questionable: 'bg-amber-100 text-amber-800 border-amber-200',
  normal: 'bg-green-100 text-green-800 border-green-200'
}

export default function FlagBadge({ flag }) {
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${STYLES[flag] ?? STYLES.normal}`}>
      {COPY.flagLabels[flag] ?? 'Flagged'}
    </span>
  )
}
