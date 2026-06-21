/**
 * @param {{ reason: string, variant?: 'block' | 'empty' }} props
 */
export default function ConsolidacionEmptyState({ reason, variant = 'block' }) {
  const isBlock = variant === 'block'

  return (
    <div
      className={`rounded-xl border p-6 text-sm ${
        isBlock
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-dashed border-slate-300 bg-slate-50 text-slate-700'
      }`}
    >
      {reason}
    </div>
  )
}
