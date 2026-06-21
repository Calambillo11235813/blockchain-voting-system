// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title Votacion
 * @notice Contrato de votación basado en hashes — sin candidatos hardcodeados.
 *
 * DISEÑO:
 *   - Los candidatos se gestionan únicamente en la base de datos (PostgreSQL).
 *   - El contrato solo registra VOTOS usando hashes de los UUIDs (elección, candidato, elector).
 *   - Solo la wallet institucional (admin/deployer) puede registrar votos.
 *   - Soporta múltiples elecciones en un mismo contrato desplegado.
 *   - Preserva el secreto del sufragio: solo se almacenan hashes, no datos personales.
 *   - votarBatch permite el flujo "Crucero" (Rectorado → Decanato → Carrera) en una tx atómica.
 */
contract Votacion {
    /// @notice Dirección del administrador (wallet institucional del backend).
    address public admin;

    /// @notice Total de votos registrados globalmente.
    uint256 public totalVotosGlobal;

    /// @notice Conteo paritario por estamento (0 = Estudiante, 1 = Docente).
    struct ConteoPorEstamento {
        uint256 votosEstudiantes;
        uint256 votosDocentes;
    }

    // ─── Mappings ──────────────────────────────────────────────────────────

    /// @notice eleccionHash => electorHash => true si ya votó.
    mapping(bytes32 => mapping(bytes32 => bool)) public yaVoto;

    /// @notice eleccionHash => candidatoHash => conteo total de votos.
    mapping(bytes32 => mapping(bytes32 => uint256)) public votos;

    /// @notice eleccionHash => candidatoHash => conteo desglosado por estamento.
    mapping(bytes32 => mapping(bytes32 => ConteoPorEstamento)) private votosPorEstamento;

    /// @notice eleccionHash => total de votos en esa elección.
    mapping(bytes32 => uint256) public totalVotosPorEleccion;

    /// @notice eleccionHash => true si la elección/papeleta está habilitada para recibir votos.
    mapping(bytes32 => bool) public eleccionActiva;

    // ─── Eventos ───────────────────────────────────────────────────────────

    /// @notice Se emite cuando un voto legacy es registrado exitosamente.
    event VotoRegistrado(
        bytes32 indexed eleccionHash,
        bytes32 indexed candidatoHash,
        bytes32 electorHash,
        uint256 timestamp
    );

    /// @notice Se emite por cada voto registrado vía votarBatch.
    event VotoBatchRegistrado(
        bytes32 indexed eleccionHash,
        bytes32 indexed candidatoHash,
        bytes32 electorHash,
        uint8 estamento,
        uint256 timestamp
    );

    // ─── Modificadores ─────────────────────────────────────────────────────

    /// @notice Restringe la función al administrador (wallet institucional).
    modifier soloAdmin() {
        require(msg.sender == admin, "Error: Solo el administrador puede ejecutar esta funcion.");
        _;
    }

    // ─── Constructor ───────────────────────────────────────────────────────

    /// @notice El deployer se convierte en el administrador.
    constructor() {
        admin = msg.sender;
    }

    // ─── Configuración de elecciones ───────────────────────────────────────

    /**
     * @notice Activa o cierra una elección/papeleta on-chain.
     * @param _eleccionHash keccak256 del UUID de la papeleta/elección.
     * @param _activa       true para habilitar votación batch, false para cerrar.
     */
    function configurarEleccionActiva(bytes32 _eleccionHash, bool _activa) external soloAdmin {
        eleccionActiva[_eleccionHash] = _activa;
    }

    // ─── Funciones principales ─────────────────────────────────────────────

    /**
     * @notice Registra un voto en la blockchain (legacy, sin desglose de estamento).
     * @dev Solo invocable por el backend mediante la wallet institucional.
     * @param _eleccionHash  keccak256 del UUID de la elección.
     * @param _candidatoHash keccak256 del UUID del candidato (frente) en BD.
     * @param _electorHash   keccak256 del UUID del elector.
     */
    function votar(
        bytes32 _eleccionHash,
        bytes32 _candidatoHash,
        bytes32 _electorHash
    ) external soloAdmin {
        require(!yaVoto[_eleccionHash][_electorHash], "Error: El elector ya emitio su voto en esta eleccion.");

        yaVoto[_eleccionHash][_electorHash] = true;
        votos[_eleccionHash][_candidatoHash]++;
        totalVotosPorEleccion[_eleccionHash]++;
        totalVotosGlobal++;

        emit VotoRegistrado(_eleccionHash, _candidatoHash, _electorHash, block.timestamp);
    }

    /**
     * @notice Registra múltiples votos del flujo Crucero en una sola transacción atómica.
     * @dev Solo invocable por el backend. Incrementa contadores totales y por estamento.
     * @param _elecciones   Arreglo paralelo de hashes de papeletas/elecciones.
     * @param _candidatos   Arreglo paralelo de hashes de candidatos (frentes).
     * @param _electorHash  keccak256 del UUID del elector (sellado backend).
     * @param _estamento    0 = Estudiante, 1 = Docente.
     */
    function votarBatch(
        bytes32[] calldata _elecciones,
        bytes32[] calldata _candidatos,
        bytes32 _electorHash,
        uint8 _estamento
    ) external soloAdmin {
        require(_elecciones.length == _candidatos.length, "Error: Los arreglos deben tener la misma longitud.");
        require(_elecciones.length > 0, "Error: El lote debe contener al menos un voto.");
        require(_estamento == 0 || _estamento == 1, "Error: El estamento debe ser 0 (Estudiante) o 1 (Docente).");

        for (uint256 i = 0; i < _elecciones.length; i++) {
            bytes32 eleccionHash = _elecciones[i];
            bytes32 candidatoHash = _candidatos[i];

            require(eleccionActiva[eleccionHash], "Error: La eleccion no esta activa o no existe.");
            require(!yaVoto[eleccionHash][_electorHash], "Error: El elector ya emitio su voto en esta eleccion.");

            yaVoto[eleccionHash][_electorHash] = true;
            votos[eleccionHash][candidatoHash]++;
            totalVotosPorEleccion[eleccionHash]++;
            totalVotosGlobal++;

            if (_estamento == 0) {
                votosPorEstamento[eleccionHash][candidatoHash].votosEstudiantes++;
            } else {
                votosPorEstamento[eleccionHash][candidatoHash].votosDocentes++;
            }

            emit VotoBatchRegistrado(
                eleccionHash,
                candidatoHash,
                _electorHash,
                _estamento,
                block.timestamp
            );
        }
    }

    // ─── Funciones de consulta (view) ──────────────────────────────────────

    /**
     * @notice Obtiene la cantidad de votos de un candidato en una elección.
     * @param _eleccionHash  keccak256 del UUID de la elección.
     * @param _candidatoHash keccak256 del UUID del candidato.
     * @return Cantidad de votos acumulados.
     */
    function obtenerVotos(
        bytes32 _eleccionHash,
        bytes32 _candidatoHash
    ) external view returns (uint256) {
        return votos[_eleccionHash][_candidatoHash];
    }

    /**
     * @notice Obtiene votos de estudiantes para un candidato en una elección.
     */
    function obtenerVotosEstudiantes(
        bytes32 _eleccionHash,
        bytes32 _candidatoHash
    ) external view returns (uint256) {
        return votosPorEstamento[_eleccionHash][_candidatoHash].votosEstudiantes;
    }

    /**
     * @notice Obtiene votos de docentes para un candidato en una elección.
     */
    function obtenerVotosDocentes(
        bytes32 _eleccionHash,
        bytes32 _candidatoHash
    ) external view returns (uint256) {
        return votosPorEstamento[_eleccionHash][_candidatoHash].votosDocentes;
    }

    /**
     * @notice Obtiene el desglose paritario de votos por estamento.
     */
    function obtenerVotosPorEstamento(
        bytes32 _eleccionHash,
        bytes32 _candidatoHash
    ) external view returns (uint256 estudiantes, uint256 docentes) {
        ConteoPorEstamento storage conteo = votosPorEstamento[_eleccionHash][_candidatoHash];
        return (conteo.votosEstudiantes, conteo.votosDocentes);
    }

    /**
     * @notice Verifica si un elector ya votó en una elección.
     * @param _eleccionHash keccak256 del UUID de la elección.
     * @param _electorHash  keccak256 del UUID del elector.
     * @return true si ya votó.
     */
    function verificarVoto(
        bytes32 _eleccionHash,
        bytes32 _electorHash
    ) external view returns (bool) {
        return yaVoto[_eleccionHash][_electorHash];
    }

    /**
     * @notice Obtiene el total de votos emitidos en una elección.
     * @param _eleccionHash keccak256 del UUID de la elección.
     * @return Total de votos en esa elección.
     */
    function obtenerTotalVotos(
        bytes32 _eleccionHash
    ) external view returns (uint256) {
        return totalVotosPorEleccion[_eleccionHash];
    }
}
