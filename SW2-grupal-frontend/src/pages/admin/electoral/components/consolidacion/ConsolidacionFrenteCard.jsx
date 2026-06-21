import { getProporcionesEstamento } from '../../../../../utils/consolidacionHierarchy'

/**
 * @param {{
 *  frente: object,
 *  index: number,
 *  isLeader: boolean,
 *  papeleta: object,
 * }} props
 */
export default function ConsolidacionFrenteCard({ frente, index, isLeader, papeleta }) {
  const { propDocentes, propEstudiantes } = getProporcionesEstamento(papeleta)
  const votosEstDocentes = Math.round((frente.votosBlockchain ?? 0) * propDocentes)
  const votosEstEstudiantes = Math.round((frente.votosBlockchain ?? 0) * propEstudiantes)
  const ptsDocentes = Number((frente.scoreDocente ?? 0) * 0.5).toFixed(2)
  const ptsEstudiantes = Number((frente.scoreEstudiante ?? 0) * 0.5).toFixed(2)

  const leaderStyles =
    isLeader && papeleta?.veredicto === 'GANADOR'
      ? 'border-blue-900 bg-blue-50 shadow-md'
      : isLeader
        ? 'border-amber-400 bg-amber-50'
        : 'border-slate-200 bg-white'

  return (
    <div className={`relative rounded-xl border-2 p-5 transition-all ${leaderStyles}`}>
      {isLeader && papeleta?.veredicto === 'GANADOR' ? (
        <span className="absolute -right-2 -top-3 rounded-full border-2 border-white bg-yellow-400 px-3 py-1 text-xs font-bold text-blue-900 shadow">
          Ganador
        </span>
      ) : null}
      {isLeader && papeleta?.veredicto === 'SEGUNDA_VUELTA' ? (
        <span className="absolute -right-2 -top-3 rounded-full border-2 border-white bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
          Segunda Vuelta
        </span>
      ) : null}

      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">#{index + 1}</p>
          <h5 className="text-lg font-bold text-blue-900">{frente.nombreFrente}</h5>
          <p className="text-sm text-slate-600">Sigla: {frente.sigla}</p>
        </div>
        <div className="rounded-lg bg-slate-100 px-4 py-2 text-right">
          <p className="text-xs uppercase text-slate-500">Puntaje ponderado</p>
          <p className="text-2xl font-bold text-blue-900">
            {Number(frente.resultadoPonderado ?? 0).toFixed(2)} pts
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Metric label="Votos absolutos" value={frente.votosBlockchain ?? 0} />
        <Metric label="% del total" value={`${Number(frente.porcentajeTotal ?? 0).toFixed(2)}%`} />
        <Metric label="Contribución 50/50" value={`${ptsDocentes} + ${ptsEstudiantes}`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        <EstamentoRow
          title="Estudiantes"
          votos={votosEstEstudiantes}
          puntos={`${ptsEstudiantes} / 50`}
        />
        <EstamentoRow title="Docentes" votos={votosEstDocentes} puntos={`${ptsDocentes} / 50`} />
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function EstamentoRow({ title, votos, puntos }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
      <div>
        <p className="text-xs font-semibold uppercase text-slate-500">{title}</p>
        <p className="text-sm font-medium text-slate-800">{votos} votos estimados</p>
      </div>
      <span className="rounded bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-900">
        {puntos} pts
      </span>
    </div>
  )
}
