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
 */
contract Votacion {
    /// @notice Dirección del administrador (wallet institucional del backend).
    address public admin;

    /// @notice Total de votos registrados globalmente.
    uint256 public totalVotosGlobal;

    // ─── Mappings ──────────────────────────────────────────────────────────

    /// @notice eleccionHash => electorHash => true si ya votó.
    mapping(bytes32 => mapping(bytes32 => bool)) public yaVoto;

    /// @notice eleccionHash => candidatoHash => conteo de votos.
    mapping(bytes32 => mapping(bytes32 => uint256)) public votos;

    /// @notice eleccionHash => total de votos en esa elección.
    mapping(bytes32 => uint256) public totalVotosPorEleccion;

    // ─── Eventos ───────────────────────────────────────────────────────────

    /// @notice Se emite cuando un voto es registrado exitosamente.
    event VotoRegistrado(
        bytes32 indexed eleccionHash,
        bytes32 indexed candidatoHash,
        bytes32 electorHash,
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

    // ─── Funciones principales ─────────────────────────────────────────────

    /**
     * @notice Registra un voto en la blockchain.
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
        // Prevención de doble voto on-chain
        require(!yaVoto[_eleccionHash][_electorHash], "Error: El elector ya emitio su voto en esta eleccion.");

        // Registrar que el elector ya votó
        yaVoto[_eleccionHash][_electorHash] = true;

        // Incrementar conteo del candidato
        votos[_eleccionHash][_candidatoHash]++;

        // Incrementar totales
        totalVotosPorEleccion[_eleccionHash]++;
        totalVotosGlobal++;

        // Emitir evento auditable
        emit VotoRegistrado(_eleccionHash, _candidatoHash, _electorHash, block.timestamp);
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