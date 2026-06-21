import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  buildEstamentoChartData,
  buildParticipationChartData,
  formatPapeletaStatsLabel,
  getCarreraEstamentoCards,
} from '../../../../../utils/estadisticasHierarchy'

/**
 * Panel de participación de una papeleta con gráficos Recharts.
 * @param {{ papeleta: object | null, showPreVotingNotice?: boolean }} props
 */
export default function BallotParticipationPanel({ papeleta, showPreVotingNotice = false }) {
  if (!papeleta) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-700">
        No hay papeletas configuradas para este alcance.
      </div>
    )
  }

  const participationData = buildParticipationChartData(papeleta)
  const estamentoData = buildEstamentoChartData(papeleta)
  const carreraEstamentoCards =
    papeleta.alcance === 'CARRERA' ? getCarreraEstamentoCards(papeleta) : []
  const label = formatPapeletaStatsLabel(papeleta)

  return (
    <div className="space-y-5">
      {showPreVotingNotice ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          La elección está sellada y lista para iniciar. Aún no se registran votos en el sistema.
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="mt-1 text-xs text-slate-600">
          Alcance: {papeleta.alcance} · Participación:{' '}
          {Number(papeleta.porcentajeParticipacion ?? 0).toFixed(2)}%
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatMini title="Habilitados" value={papeleta.habilitados ?? 0} />
        <StatMini title="Votos emitidos" value={papeleta.votosEmitidos ?? 0} />
        <StatMini title="Pendientes" value={papeleta.pendientes ?? 0} />
        <StatMini
          title="Participación"
          value={`${Number(papeleta.porcentajeParticipacion ?? 0).toFixed(2)}%`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-blue-900">Participación de la papeleta</h4>
        <div className="mt-4 h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={participationData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip cursor={{ fill: '#f8fafc' }} />
              <Legend />
              <Bar dataKey="Habilitados" fill="#94a3b8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Emitidos" fill="#f2a900" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pendientes" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h4 className="text-sm font-semibold text-blue-900">Desglose por estamento</h4>

        {carreraEstamentoCards.length ? (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {carreraEstamentoCards.map((card) => (
              <div
                key={card.key}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-xs font-semibold uppercase text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-blue-900">
                  {card.votos} / {card.habilitados}
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Participación: {Number(card.porcentaje ?? 0).toFixed(2)}%
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {estamentoData.length ? (
          <div className={`${carreraEstamentoCards.length ? 'mt-5' : 'mt-4'} h-72 w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={estamentoData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Legend />
                <Bar dataKey="Habilitados" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Emitidos" fill="#f2a900" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No hay electores habilitados registrados para esta papeleta.
          </p>
        )}
      </div>
    </div>
  )
}

function StatMini({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-blue-900">{value}</p>
    </div>
  )
}
