import java.util.List;
import java.util.Date;

// --- Clases autogeneradas para importación a Enterprise Architect ---

public class Candidato {
    public String id;
    public String ci;
    public String nombres;
    public String apellidos;
    public string fotoUrl;
    public string rolEspecifico;
    public Frente frente;
    public EleccionCargo eleccionCargo;
    public ApiResponse crearCandidato(CrearCandidatoDto crearCandidatoDto) { return null; }
    public Candidato crearCandidatoEnTransaccion(EntityManager manager, DatosCandidatoTransaccion datos) { return null; }
    public List<ApiResponse> listarCandidatos(string eleccionId) { return null; }
    public ApiResponse obtenerCandidatoPorId(String candidatoId) { return null; }
    public ApiResponse actualizarCandidato(String candidatoId, ActualizarCandidatoDto actualizarCandidatoDto) { return null; }
    public ApiResponse eliminarCandidato(String candidatoId) { return null; }
}

public class Cargo {
    public String id;
    public String nombre;
    public string facultad;
    public TipoCargoEnum tipoCargo;
    public List<EleccionCargo> eleccionCargos;
    public ApiResponse crearCargo(CrearCargoDto crearCargoDto) { return null; }
    public List<ApiResponse> listarCargos() { return null; }
    public ApiResponse obtenerCargoPorId(String cargoId) { return null; }
    public ApiResponse actualizarCargo(String cargoId, ActualizarCargoDto actualizarCargoDto) { return null; }
    public ApiResponse eliminarCargo(String cargoId) { return null; }
}

public class EleccionCargo {
    public String id;
    public AlcancePapeletaEnum alcance;
    public string codFacultad;
    public string facultadNombre;
    public string codCarrera;
    public string carreraNombre;
    public Integer orden;
    public Boolean estaActiva;
    public Eleccion eleccion;
    public Cargo cargo;
    public List<Frente> frentesLegacy;
    public List<Candidato> candidatos;
}

public class Eleccion {
    public String id;
    public String titulo;
    public Integer gestion;
    public Date fecha;
    public Boolean restriccionAlfabeticaActiva;
    public Boolean estaActiva;
    public EstadoEleccionEnum estado;
    public Administrador administrador;
    public List<EleccionCargo> eleccionCargos;
    public List<Frente> frentes;
    public ApiResponse crearEleccion(CrearEleccionDto crearEleccionDto) { return null; }
    public List<ApiResponse> listarElecciones() { return null; }
    public ApiResponse obtenerEleccionPorId(String eleccionId) { return null; }
    public ApiResponse actualizarEleccion(String eleccionId, ActualizarEleccionDto actualizarEleccionDto) { return null; }
    public ApiResponse eliminarEleccion(String eleccionId) { return null; }
    public Eleccio obtenerEleccionActivaDelDia(Date fechaReferencia) { return null; }
    public Date obtenerVentanaAsignadaPorApellido(Date fechaEleccion, String apellido) { return null; }
    public ApiResponse toggleRestriccionAlfabetica(String eleccionId) { return null; }
    public ApiResponse sellarEleccion(String eleccionId) { return null; }
    public void validarAccesoVotante(String apellido, String eleccionId) { return null; }
    public Date obtenerVentanaVotacionDelDia(Date fechaEleccion) { return null; }
}

public class Frente {
    public String id;
    public String nombreFrente;
    public String sigla;
    public string logoUrl;
    public Boolean esOpcionGlobal;
    public Eleccion eleccion;
    public EleccionCargo eleccionCargo;
    public List<Candidato> candidatos;
    public ApiResponse registrarFrentePorEleccion(String eleccionId, CrearFrenteDto crearFrenteDto) { return null; }
    public ApiResponse registrarFrente(String eleccionCargoId, CrearFrenteDto crearFrenteDto) { return null; }
    public List<ApiResponse> listarFrentesPorEleccion(String eleccionId) { return null; }
    public List<ApiResponse> listarFrentesPorEleccionCargo(String eleccionCargoId) { return null; }
    public List<ApiResponse> listarFrentes(string eleccionId) { return null; }
    public ApiResponse obtenerFrentePorId(String frenteId) { return null; }
    public ApiResponse actualizarFrente(String frenteId, ActualizarFrenteDto actualizarFrenteDto) { return null; }
    public ApiResponse eliminarFrente(String frenteId) { return null; }
}

public class PadronElectoral {
    public String id;
    public Boolean estaHabilitado;
    public string codLugar;
    public string lugarVotacion;
    public Boolean habilitadoRector;
    public Date fechaRegistro;
    public Eleccion eleccion;
    public Elector elector;
    public number vincularPadronExistenteAEleccion(String eleccionId, EntityManager manager) { return null; }
    public ApiResponse cargarPadronElectoral(String eleccionId, Buffer archivo) { return null; }
    public List<ApiResponse> listarPadronElectoral(String eleccionId, Integer page, Integer limit, string estamento) { return null; }
    public List<ApiResponse> obtenerFacultadesDePadron(String eleccionId) { return null; }
    public List<ApiResponse> obtenerCarrerasDePadron(String eleccionId, String codFacultad) { return null; }
    public ApiResponse toggleHabilitacionElector(String eleccionId, String electorId) { return null; }
    public ApiResponse validarAccesoVotante(String registro, String eleccionId) { return null; }
}

public class ParametroSistema {
    public String id;
    public String clave;
    public String valor;
    public String descripcion;
    public string tipo;
    public String actualizadoPor;
    public Date createdAt;
    public Date updatedAt;
}

public class RegistroSufragio {
    public String id;
    public Date fechaSufragio;
    public String hashTransaccion;
    public Eleccion eleccion;
    public EleccionCargo eleccionCargo;
    public Elector elector;
}

public class Administrador {
    public String id;
    public String nombre;
    public String apellido;
    public String correo;
    public String password;
    public RolAdministrador rol;
    public List<Eleccion> elecciones;
    public Object buscarAdministradorPorCorreo(String correo) { return null; }
    public number contarAdministradores() { return null; }
    public Administrador crearAdministrador(String nombre, String apellido, String correo, String passwordHash, RolAdministrador rol) { return null; }
    public Object crearAdministradorDesdeDto(CrearAdministradorDto dto) { return null; }
    public void corregirRolAdministrador(String id, RolAdministrador rol) { return null; }
    public Object obtenerPerfil(String adminId) { return null; }
    public Object actualizarPerfil(String adminId, ActualizarPerfilAdminDto dto) { return null; }
    public void cambiarPassword(String adminId, CambiarPasswordAdminDto dto) { return null; }
    public List<Object> listarAdministradores() { return null; }
    public void eliminarAdministrador(String id) { return null; }
    public tokenstringelectorany loginElector(String registro, String passwordInstitucional, string eleccionId) { return null; }
    public ApiResponse loginAdministrador(LoginAdminDto loginAdminDto) { return null; }
}

public class Elector {
    public String id;
    public String ci;
    public String registro;
    public string registroDocente;
    public String nombre;
    public String apellido;
    public EstamentoEnum estamento;
    public String carrera;
    public String facultad;
    public string codFacultad;
    public string codCarrera;
    public Date created_at;
    public Date updated_at;
    public Elector buscarPorRegistro(String registro) { return null; }
    public Electo buscarPorCi(String ci) { return null; }
    public number contarEstudiantes() { return null; }
}

