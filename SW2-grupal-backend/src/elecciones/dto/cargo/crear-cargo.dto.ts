import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
} from 'class-validator';
import { AlcancePapeletaEnum } from '../../enums/alcance-papeleta.enum';
import { TipoCargoEnum } from '../../enums/tipo-cargo.enum';

/**
 * DTO para crear un cargo en el catálogo y vincularlo como papeleta a una elección.
 */
export class CrearCargoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  /** Facultad descriptiva legacy del catálogo (opcional). */
  @IsOptional()
  @IsString()
  facultad?: string;

  @IsOptional()
  @IsEnum(TipoCargoEnum)
  tipoCargo?: TipoCargoEnum;

  /** UUID del proceso electoral al que pertenece esta papeleta. */
  @IsUUID()
  @IsNotEmpty()
  eleccionId: string;

  /** Alcance territorial de la papeleta dentro del proceso. */
  @IsEnum(AlcancePapeletaEnum)
  alcance: AlcancePapeletaEnum;

  @ValidateIf((dto) => dto.alcance === AlcancePapeletaEnum.FACULTAD || dto.alcance === AlcancePapeletaEnum.CARRERA)
  @IsString()
  @IsNotEmpty()
  codFacultad?: string;

  @ValidateIf((dto) => dto.alcance === AlcancePapeletaEnum.FACULTAD || dto.alcance === AlcancePapeletaEnum.CARRERA)
  @IsOptional()
  @IsString()
  facultadNombre?: string;

  @ValidateIf((dto) => dto.alcance === AlcancePapeletaEnum.CARRERA)
  @IsString()
  @IsNotEmpty()
  codCarrera?: string;

  @ValidateIf((dto) => dto.alcance === AlcancePapeletaEnum.CARRERA)
  @IsOptional()
  @IsString()
  carreraNombre?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
