/**
 * Dashboard para rol SISTEMAS.
 * 
 * Muestra casos de uso específicos del rol SISTEMAS:
 * - CU-01: Gestionar cuentas administrativas
 * - CU-02: Configurar parámetros del sistema
 * - CU-03: Desplegar Smart Contracts (info)
 * - CU-04: Administrar nodos de la red
 * - CU-20: Auditar integridad de la red
 */

export default function DashboardSistemas() {
  const casos_uso = [
    {
      id: 'CU-01',
      titulo: 'Gestionar cuentas administrativas',
      descripcion: 'Crear, listar y eliminar cuentas de administradores del sistema',
      ruta: '/admin/admins',
      icono: '👥',
    },
    {
      id: 'CU-02',
      titulo: 'Configurar parámetros del sistema',
      descripcion: 'Ajustar parámetros dinámicos del sistema en tiempo real',
      ruta: '/admin/configuracion',
      icono: '⚙️',
    },
    {
      id: 'CU-03',
      titulo: 'Desplegar Smart Contracts',
      descripcion: 'Gestionar el despliegue de contratos inteligentes en blockchain',
      ruta: '/admin/despliegue-contratos',
      icono: '🔗',
    },
    {
      id: 'CU-04',
      titulo: 'Administrar nodos de la red',
      descripcion: 'Monitorear la salud y estado de los nodos RPC',
      ruta: '/admin/nodos',
      icono: '🔌',
    },
    {
      id: 'CU-20',
      titulo: 'Auditar integridad de la red',
      descripcion: 'Auditar transacciones y bloques en blockchain',
      ruta: '/admin/auditoria',
      icono: '🔍',
    },
  ]

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-blue-900">Panel de Sistemas</h2>
        <p className="mt-1 text-sm text-slate-700">
          Acceso a herramientas de configuración técnica y monitoreo de infraestructura blockchain.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {casos_uso.map((cu) => (
          <a
            key={cu.id}
            href={cu.ruta}
            className={`rounded-xl border-2 p-6 transition ${
              cu.disabled
                ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-60'
                : 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-3xl">{cu.icono}</span>
              <div>
                <h3 className="font-semibold text-blue-900">{cu.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{cu.descripcion}</p>
                {cu.disabled && (
                  <span className="mt-2 inline-block rounded-full bg-slate-300 px-2 py-1 text-xs font-semibold text-slate-700">
                    Próximamente
                  </span>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
