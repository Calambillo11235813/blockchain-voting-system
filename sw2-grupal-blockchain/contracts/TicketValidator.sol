// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title TicketValidator
 * @dev Contrato para registrar validaciones de tickets de forma inmutable con soporte para múltiples tenants
 */
contract TicketValidator {
    // Estructura para almacenar registros de validación
    struct ValidationRecord {
        string ticketId; // ID del ticket validado
        string purchaseId; // ID de la compra
        string validatorId; // ID del usuario que validó
        uint256 validatedAt; // Timestamp de validación
        string eventId; // ID del evento
        string sectionName; // Sección del ticket
        string tenantId; // ID del tenant
        string tenantName; // Nombre del tenant
        bytes32 validationHash; // Hash único de la validación
    }

    // Estructura para almacenar información de tenants
    struct TenantInfo {
        string tenantId; // ID del tenant
        string name; // Nombre del tenant
        uint256 validationsCount; // Contador de validaciones
        uint256 registeredAt; // Timestamp de registro
        bool isActive; // Si el tenant está activo
    }

    // Mapeo de ID de ticket a su registro de validación
    mapping(string => ValidationRecord) public validations;

    // Mapeo de hash de validación a ID de ticket
    mapping(bytes32 => string) public validationHashes;

    // Mapeo de ID de tenant a su información
    mapping(string => TenantInfo) public tenants;

    // Array para mantener track de todos los IDs de tenants
    string[] public tenantIds;

    // Registros de tickets por validador
    mapping(string => uint256) public validatorCounts;

    // Registros de tickets por evento
    mapping(string => uint256) public eventValidationCounts;

    // Registros de tickets por tenant
    mapping(string => uint256) public tenantValidationCounts;

    // Total de validaciones registradas
    uint256 public totalValidations;

    // Admin del contrato
    address public admin;

    // Eventos
    event TicketValidated(
        string ticketId,
        string purchaseId,
        string validatorId,
        uint256 timestamp,
        string eventId,
        string tenantId,
        bytes32 validationHash
    );

    event TenantRegistered(string tenantId, string name, uint256 timestamp);

    modifier onlyAdmin() {
        require(
            msg.sender == admin,
            "Solo el administrador puede realizar esta accion"
        );
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    /**
     * @dev Registra un nuevo tenant en el sistema
     * @param tenantId ID único del tenant
     * @param name Nombre del tenant
     */
    function registerTenant(
        string calldata tenantId,
        string calldata name
    ) external {
        require(tenants[tenantId].registeredAt == 0, "Tenant ya registrado");

        tenants[tenantId] = TenantInfo({
            tenantId: tenantId,
            name: name,
            validationsCount: 0,
            registeredAt: block.timestamp,
            isActive: true
        });

        tenantIds.push(tenantId);

        emit TenantRegistered(tenantId, name, block.timestamp);
    }

    /**
     * @dev Activa o desactiva un tenant
     * @param tenantId ID del tenant
     * @param isActive Estado de activación
     */
    function setTenantActive(
        string calldata tenantId,
        bool isActive
    ) external onlyAdmin {
        require(tenants[tenantId].registeredAt > 0, "Tenant no existe");
        tenants[tenantId].isActive = isActive;
    }

    /**
     * @dev Registra la validación de un ticket en la blockchain
     * @param ticketId ID del ticket que fue validado
     * @param purchaseId ID de la compra
     * @param validatorId ID del usuario que está validando el ticket
     * @param eventId ID del evento
     * @param sectionName Nombre de la sección
     * @param tenantId ID del tenant al que pertenece el ticket
     * @param tenantName Nombre del tenant (opcional, para registros históricos)
     * @return validationHash Hash único generado para esta validación
     */
    function registerValidation(
        string calldata ticketId,
        string calldata purchaseId,
        string calldata validatorId,
        string calldata eventId,
        string calldata sectionName,
        string calldata tenantId,
        string calldata tenantName
    ) external returns (bytes32 validationHash) {
        // Verificar que el tenant exista o registrarlo si es la primera vez
        if (tenants[tenantId].registeredAt == 0) {
            tenants[tenantId] = TenantInfo({
                tenantId: tenantId,
                name: tenantName,
                validationsCount: 0,
                registeredAt: block.timestamp,
                isActive: true
            });

            tenantIds.push(tenantId);

            emit TenantRegistered(tenantId, tenantName, block.timestamp);
        }

        // Verificar que el tenant esté activo
        require(tenants[tenantId].isActive, "Tenant no activo");

        // Verificar que el ticket no haya sido validado antes
        require(
            bytes(validations[ticketId].ticketId).length == 0,
            "Ticket ya validado"
        );

        // Generar hash único para esta validación
        validationHash = keccak256(
            abi.encodePacked(
                ticketId,
                purchaseId,
                validatorId,
                block.timestamp,
                eventId,
                tenantId
            )
        );

        // Almacenar el registro de validación
        ValidationRecord memory record = ValidationRecord({
            ticketId: ticketId,
            purchaseId: purchaseId,
            validatorId: validatorId,
            validatedAt: block.timestamp,
            eventId: eventId,
            sectionName: sectionName,
            tenantId: tenantId,
            tenantName: tenantName,
            validationHash: validationHash
        });

        validations[ticketId] = record;
        validationHashes[validationHash] = ticketId;

        // Actualizar contadores
        validatorCounts[validatorId]++;
        eventValidationCounts[eventId]++;
        tenantValidationCounts[tenantId]++;
        tenants[tenantId].validationsCount++;
        totalValidations++;

        // Emitir evento
        emit TicketValidated(
            ticketId,
            purchaseId,
            validatorId,
            block.timestamp,
            eventId,
            tenantId,
            validationHash
        );

        return validationHash;
    }

    /**
     * @dev Verifica si un ticket ha sido validado
     * @param ticketId ID del ticket a verificar
     * @return isValidated true si el ticket fue validado
     * @return record Registro completo de validación
     */
    function verifyTicket(
        string calldata ticketId
    ) external view returns (bool isValidated, ValidationRecord memory record) {
        ValidationRecord memory storedRecord = validations[ticketId];
        bool validated = bytes(storedRecord.ticketId).length > 0;

        return (validated, storedRecord);
    }

    /**
     * @dev Verifica la autenticidad de un hash de validación
     * @param hash Hash a verificar
     * @return isValid true si el hash es válido
     * @return record Registro de validación asociado
     */
    function verifyValidationHash(
        bytes32 hash
    ) external view returns (bool isValid, ValidationRecord memory record) {
        string memory ticketId = validationHashes[hash];

        // Si el ticketId está vacío, el hash no existe
        if (bytes(ticketId).length == 0) {
            return (
                false,
                ValidationRecord("", "", "", 0, "", "", "", "", bytes32(0))
            );
        }

        return (true, validations[ticketId]);
    }

    /**
     * @dev Obtiene estadísticas de validación por evento
     * @param eventId ID del evento
     * @return totalCount Total de validaciones para el evento
     */
    function getEventStats(
        string calldata eventId
    ) external view returns (uint256 totalCount) {
        return eventValidationCounts[eventId];
    }

    /**
     * @dev Obtiene estadísticas de validación por validador
     * @param validatorId ID del usuario validador
     * @return totalCount Total de validaciones realizadas por el validador
     */
    function getValidatorStats(
        string calldata validatorId
    ) external view returns (uint256 totalCount) {
        return validatorCounts[validatorId];
    }

    /**
     * @dev Obtiene estadísticas de validación por tenant
     * @param tenantId ID del tenant
     * @return totalCount Total de validaciones para el tenant
     */
    function getTenantStats(
        string calldata tenantId
    ) external view returns (uint256 totalCount) {
        return tenantValidationCounts[tenantId];
    }

    /**
     * @dev Obtiene la información de un tenant específico
     * @param tenantId ID del tenant
     * @return info Información completa del tenant
     */
    function getTenantInfo(
        string calldata tenantId
    ) external view returns (TenantInfo memory info) {
        require(tenants[tenantId].registeredAt > 0, "Tenant no existe");
        return tenants[tenantId];
    }

    /**
     * @dev Obtiene la cantidad total de tenants registrados
     * @return count Cantidad de tenants
     */
    function getTenantCount() external view returns (uint256 count) {
        return tenantIds.length;
    }

    /**
     * @dev Obtiene la lista de tenants paginada
     * @param offset Posición inicial para la paginación
     * @param limit Cantidad máxima de tenants a devolver
     * @return tenantList Lista de información de tenants
     */
    function getTenants(
        uint256 offset,
        uint256 limit
    ) external view returns (TenantInfo[] memory tenantList) {
        uint256 total = tenantIds.length;

        if (offset >= total) {
            return new TenantInfo[](0);
        }

        uint256 end = offset + limit;
        if (end > total) {
            end = total;
        }

        uint256 resultLength = end - offset;
        tenantList = new TenantInfo[](resultLength);

        for (uint256 i = 0; i < resultLength; i++) {
            string memory tenantId = tenantIds[offset + i];
            tenantList[i] = tenants[tenantId];
        }

        return tenantList;
    }
}
