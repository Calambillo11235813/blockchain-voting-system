export interface ApiResponse<T> {
    statusCode: number;
    data: T | null;
    message?: string;
    errors?: string[];
    metadata?: {
        timestamp: string;
        version?: string;
        pagination?: {
            total: number;
            page: number;
            limit: number;
            pages: number;
        }
    }
}

// Función para crear respuestas consistentes
export function createApiResponse<T>(
    statusCode: number,
    data: T | null,
    message?: string,
    errors?: string[],
    paginationData?: { total: number; page: number; limit: number }
): ApiResponse<T> {
    const response: ApiResponse<T> = {
        statusCode,
        data,
        message,
        errors,
        metadata: {
            timestamp: new Date().toLocaleString("en-US", { timeZone: "America/La_Paz" }),
            version: process.env.API_VERSION || '1.0'
        }
    };

    if (paginationData) {
        response.metadata!.pagination = {
            ...paginationData,
            pages: Math.ceil(paginationData.total / paginationData.limit)
        };
    }

    return response;
}