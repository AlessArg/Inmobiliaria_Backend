import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateMarcajeDto {
    @IsOptional()
    @IsString()
    fecha_hora?: string;

    @IsOptional()
    @IsString()
    descripcion?: string;

    @IsOptional()
    @IsString()
    motivo?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    id_employee?: number;
}
