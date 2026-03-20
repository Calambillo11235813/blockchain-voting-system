import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
    /**
     * Número de elementos a omitir antes de comenzar a recopilar
     * Si se proporciona page, este valor será ignorado
     */

    @IsOptional()
    @IsNumber()
    @Min(0)
    @Type(() => Number)
    offset?: number = 0;

    /**
     * Número máximo de elementos a retornar
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    limit?: number = 10;

    /**
     * Número de página (comenzando desde 1)
     * Tiene prioridad sobre offset si ambos están presentes
     */
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Type(() => Number)
    page?: number;

    /**
     * Término de búsqueda para filtrar resultados
     */
    @IsOptional()
    @IsString()
    search?: string;

    /**
     * Dirección del ordenamiento
     */
    @IsOptional()
    @IsString()
    order?: 'ASC' | 'DESC' = 'DESC';

    /**
     * Campo por el cual ordenar los resultados
     */
    @IsOptional()
    @IsString()
    orderBy?: string = 'created_at';
}