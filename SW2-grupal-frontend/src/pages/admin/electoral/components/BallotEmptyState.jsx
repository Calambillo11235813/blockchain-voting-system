/**
 * Estado vacío reutilizable para la previsualización de papeletas.
 * @param {{ title: string, description: string, tone?: 'neutral' | 'warning' }} props
 * @returns {import('react').JSX.Element}
 */
export default function BallotEmptyState({ title, description, tone = 'neutral' }) {
  const toneClasses =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-900'

  const descriptionClasses = tone === 'warning' ? 'text-amber-800' : 'text-slate-700'

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClasses}`}>
      <p className="text-sm font-semibold">{title}</p>
      <p className={`mt-1 text-sm ${descriptionClasses}`}>{description}</p>
    </div>
  )
}
