import { IsInt, IsOptional, Min } from 'class-validator';

export class GetMunicipalitiesByCityDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    id_city?: number;
}
