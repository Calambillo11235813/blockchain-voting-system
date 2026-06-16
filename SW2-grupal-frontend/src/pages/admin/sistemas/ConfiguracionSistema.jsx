import { useEffect, useState } from 'react'
import {
  obtenerParametros,
  actualizarParametro,
  crearParametro,
} from '../../../services/configuracionService'

const PARAMETROS_SISTEMA = {
  // Sistema Electoral
  BYPASS_ELECTION_TIME: { label: "Omitir Horario Electoral", tipo: "boolean", descripcion: "Desactiva el reloj electoral. Permite emitir votos sin importar la hora o la letra del apellido.", categoria: "Sistema Electoral" },
  
  // Biometría e IA
  BYPASS_BIOMETRIA_FACE_MATCH: { label: "Omitir Reconocimiento Facial", tipo: "boolean", descripcion: "Desactiva la evaluación estricta de coincidencia facial al momento de verificar la identidad.", categoria: "Biometría e Inteligencia Artificial" },
  BYPASS_BIOMETRIA_OCR: { label: "Omitir Lectura OCR", tipo: "boolean", descripcion: "Desactiva el reconocimiento de texto (OCR) en ambos lados del carnet para facilitar pruebas.", categoria: "Biometría e Inteligencia Artificial" },
  GEMINI_MODEL: { label: "Modelo de Gemini", tipo: "text", descripcion: "Versión exacta del modelo de inteligencia artificial de Google a utilizar (ej. gemini-2.5-flash).", categoria: "Biometría e Inteligencia Artificial" },
  
  // Blockchain y Nodos
  NODOS_RPC_URLS: { label: "Nodos Blockchain (RPC)", tipo: "text", descripcion: "URLs de los nodos de la red separadas por coma para el monitoreo de salud del sistema.", categoria: "Blockchain y Nodos" },
  VOTACION_CONTRACT_ADDRESS: { label: "Dirección del Contrato", tipo: "text", descripcion: "Dirección en la blockchain del contrato inteligente actualmente en uso para registrar votos.", categoria: "Blockchain y Nodos" }
};

export default function ConfiguracionSistema() {
  const [parametros, setParametros] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [editando, setEditando] = useState(null)
  const [showForm, setShowForm] = useState(false)
  
  // Extraemos la primera clave por defecto para inicializar el formulario
  const [primeraClave] = Object.keys(PARAMETROS_SISTEMA);
  
  const getInitialFormState = (clave) => {
    const meta = PARAMETROS_SISTEMA[clave];
    // Map de tipos: text/select -> STRING, number -> NUMBER, boolean -> BOOLEAN
    let backendType = 'STRING';
    let defaultValue = '';
    
    if (meta.tipo === 'boolean') {
      backendType = 'BOOLEAN';
      defaultValue = false;
    } else if (meta.tipo === 'number') {
      backendType = 'NUMBER';
      defaultValue = 0;
    } else if (meta.tipo === 'select' && meta.opciones?.length > 0) {
      defaultValue = meta.opciones[0];
    }

    return {
      clave: clave,
      valor: defaultValue,
      tipo: backendType,
      descripcion: meta.descripcion,
    }
  }

  const [formData, setFormData] = useState(getInitialFormState(primeraClave))

  useEffect(() => {
    cargarParametros()
  }, [])

  const cargarParametros = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await obtenerParametros()
      setParametros(data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Error cargando parámetros')
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleActualizar = async (parametro) => {
    try {
      setError(null)
      
      // Parsear el valor antes de enviar
      let parsedValue = parametro.valor;
      if (parametro.tipo === 'BOOLEAN') {
        parsedValue = parsedValue === 'true' || parsedValue === true;
      } else if (parametro.tipo === 'NUMBER') {
        parsedValue = Number(parsedValue);
      }

      await actualizarParametro(parametro.clave, {
        valor: parsedValue.toString(),
        descripcion: parametro.descripcion,
      })
      setEditando(null)
      await cargarParametros()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error actualizando parámetro')
      console.error('Error:', err)
    }
  }

  const handleCrear = async (e) => {
    e.preventDefault()
    if (!formData.clave || formData.valor === undefined || formData.valor === '') {
      setError('Por favor rellena los campos requeridos')
      return
    }

    try {
      setError(null)
      let parsedValue = formData.valor;
      if (formData.tipo === 'BOOLEAN') {
        parsedValue = parsedValue === 'true' || parsedValue === true;
      } else if (formData.tipo === 'NUMBER') {
        parsedValue = Number(parsedValue);
      }

      await crearParametro({
        ...formData,
        valor: parsedValue.toString()
      })
      
      setFormData(getInitialFormState(primeraClave))
      setShowForm(false)
      await cargarParametros()
    } catch (err) {
      setError(err?.response?.data?.message || 'Error creando parámetro')
      console.error('Error:', err)
    }
  }



  const handleClaveChange = (e) => {
    const nuevaClave = e.target.value;
    setFormData(getInitialFormState(nuevaClave));
  }

  // Helper para renderizar los campos dinámicos
  const renderDynamicInput = (context, data, onChange) => {
    const metaInfo = PARAMETROS_SISTEMA[data.clave];
    if (!metaInfo) {
      // Fallback a texto normal si no está en el diccionario
      return (
        <input
          type={data.tipo === 'NUMBER' ? 'number' : 'text'}
          value={data.valor}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0a3366] focus:outline-none"
        />
      );
    }

    if (metaInfo.tipo === 'boolean') {
      const isChecked = data.valor === true || data.valor === 'true';
      return (
        <label className="flex cursor-pointer border rounded items-center bg-gray-50 px-4 py-2 mt-1">
          <div className="relative">
            <input 
              type="checkbox" 
              className="sr-only" 
              checked={isChecked}
              onChange={(e) => onChange(e.target.checked)} 
            />
            <div className={`block h-8 w-14 rounded-full transition-colors ${isChecked ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <div className={`dot absolute left-1 top-1 h-6 w-6 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-6' : ''}`}></div>
          </div>
          <div className="ml-3 font-medium text-gray-700">
            {isChecked ? 'Activado' : 'Desactivado'}
          </div>
        </label>
      );
    }
    
    if (metaInfo.tipo === 'select') {
      return (
        <select
          value={data.valor}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0a3366] focus:outline-none"
        >
          {metaInfo.opciones.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    return (
      <input
        type={metaInfo.tipo === 'number' ? 'number' : 'text'}
        value={data.valor}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-[#0a3366] focus:outline-none"
      />
    )
  }

  const renderValorVisual = (parametro) => {
    const metaInfo = PARAMETROS_SISTEMA[parametro.clave];

    if (editando?.clave === parametro.clave) {
      return renderDynamicInput('edit', editando, (nuevoValor) => setEditando({ ...editando, valor: nuevoValor }));
    }

    const tipoInterpretado = metaInfo ? metaInfo.tipo : (parametro.tipo === 'BOOLEAN' ? 'boolean' : 'text');

    if (tipoInterpretado === 'boolean') {
      const isChecked = parametro.valor === true || parametro.valor === 'true';
      return (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isChecked
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-200 text-gray-600'
          }`}
        >
          {isChecked ? 'Activado' : 'Desactivado'}
        </span>
      )
    }

    return <span className="text-sm font-medium text-gray-900">{parametro.valor}</span>
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0a3366]">Configuración del Sistema</h1>
          <p className="mt-1 text-gray-600">
            Administración de parámetros operacionales
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setFormData(getInitialFormState(primeraClave));
          }}
          className={`rounded-lg px-4 py-2 font-medium text-white transition-colors ${showForm ? 'bg-gray-500 hover:bg-gray-600' : 'bg-[#f2a900] hover:bg-yellow-600'}`}
        >
          {showForm ? 'Volver al listado' : 'Agregar Parámetro'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-[#d32f2f]">
          <p className="font-semibold">Error al procesar la solicitud</p>
          <p>{error}</p>
        </div>
      )}

      {showForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-[#0a3366]">Nuevo Parámetro del Sistema</h2>
          <form onSubmit={handleCrear} className="space-y-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Parámetro a Configurar</label>
                <select
                  value={formData.clave}
                  onChange={handleClaveChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#0a3366] focus:outline-none"
                >
                  {Object.entries(PARAMETROS_SISTEMA).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                  {/* Si necesitamos agregar uno no listado manualmente */}
                  {!PARAMETROS_SISTEMA[formData.clave] && (
                    <option value={formData.clave}>{formData.clave} (Personalizado)</option>
                  )}
                </select>
                
                {/* Caja de Descripción Dinámica */}
                {PARAMETROS_SISTEMA[formData.clave] && (
                  <div className="mt-2 flex items-start gap-2 text-sm text-gray-500 bg-gray-50 p-3 rounded border">
                    <span>ℹ️</span> 
                    <p>{PARAMETROS_SISTEMA[formData.clave].descripcion}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Valor Asignado</label>
              {renderDynamicInput('create', formData, (nuevoValor) => setFormData({ ...formData, valor: nuevoValor }))}
            </div>

            {/* Ocultamos descripción manual a menos que no esté en el diccionario */}
            {!PARAMETROS_SISTEMA[formData.clave] && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción Interna</label>
                <textarea
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#0a3366] focus:outline-none"
                  rows="2"
                />
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-[#0a3366] px-6 py-2 text-white hover:bg-blue-800 transition-colors font-medium shadow-md"
              >
                Guardar Configuración
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-[#0a3366] font-medium">Sincronizando información...</p>
        </div>
      ) : (
        !showForm && (
          <div className="space-y-4">
            {parametros.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-600">
                No hay parámetros configurados o no se pudieron cargar.
              </div>
            ) : (
              Object.entries(
                parametros.reduce((acc, param) => {
                  const meta = PARAMETROS_SISTEMA[param.clave];
                  const categoria = meta ? meta.categoria : 'Otros Parámetros';
                  if (!acc[categoria]) acc[categoria] = [];
                  acc[categoria].push(param);
                  return acc;
                }, {})
              ).map(([categoria, paramsCategoria]) => (
                <div key={categoria} className="mb-8">
                  <h2 className="mb-4 text-xl font-bold text-gray-800 border-b pb-2">
                    {categoria}
                  </h2>
                  <div className="space-y-4">
                    {paramsCategoria.map((param) => {
                      const meta = PARAMETROS_SISTEMA[param.clave];
                      return (
                        <div
                          key={param.clave}
                          className={`rounded-xl border ${editando?.clave === param.clave ? 'border-[#0a3366] bg-blue-50/30' : 'border-gray-200 bg-white'} p-6 shadow-sm hover:shadow-md transition-shadow`}
                        >
                          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                            
                            {/* Lado izquierdo (Info) */}
                            <div className="flex-1">
                              <h3 className="text-lg font-bold text-[#0a3366]">{meta ? meta.label : param.clave}</h3>
                              <p className="text-xs font-mono text-gray-400 mt-1 uppercase tracking-wide">{param.clave}</p>
                              
                              <div className="mt-3 text-sm text-gray-600">
                                {meta ? meta.descripcion : param.descripcion}
                              </div>
                            </div>

                            {/* Lado derecho (Control) */}
                            <div className="md:w-64 flex flex-col md:items-end">
                              <div className="w-full">
                                 <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Estado / Valor</p>
                                 {renderValorVisual(param)}
                              </div>

                              {editando?.clave === param.clave ? (
                                <div className="mt-4 flex gap-2 justify-end w-full">
                                  <button
                                    onClick={() => setEditando(null)}
                                    className="rounded border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleActualizar(editando)}
                                    className="rounded bg-[#0a3366] px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 transition-colors"
                                  >
                                    Guardar
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-4 flex gap-2 justify-end w-full">
                                  <button
                                    onClick={() => setEditando(param)}
                                    className="rounded bg-[#f2a900] px-3 py-1.5 text-sm font-medium text-white hover:bg-yellow-600 transition-colors"
                                  >
                                    Editar
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        )
      )}
    </div>
  )
}
