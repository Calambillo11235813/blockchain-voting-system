import { PaginationDto } from '../dto/pagination.dto';

export const calculatePagination = (paginationDto: PaginationDto) => {
    const {
        limit = 10,
        offset = 0,
        page,
        order = 'DESC',
        orderBy = 'created_at',
        search = ''
    } = paginationDto;

    // Si se proporciona una página, calcular el offset basado en la página
    // Si no, usar el offset proporcionado directamente
    const calculatedOffset = page ? (page - 1) * limit : offset;

    // Calcular el número de página actual (incluso si se proporcionó offset)
    const calculatedPage = page || Math.floor(offset / limit) + 1;

    return {
        limit,
        offset: calculatedOffset,
        page: calculatedPage,
        order,
        orderBy,
        search
    };
};