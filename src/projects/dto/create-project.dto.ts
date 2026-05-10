import {
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
} from 'class-validator';

export class CreateProjectDto {
    @IsOptional()
    @IsString()
    project_name?: string;

    @IsOptional()
    @IsString()
    project_latitude?: string;

    @IsOptional()
    @IsString()
    project_longitude?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    project_city_location?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    project_municipality_location?: number;

    @IsOptional()
    @IsString()
    project_location_extra_description?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    project_construction_style?: number;

    @IsOptional()
    @IsString()
    project_description?: string;

    @IsOptional()
    @IsNumber()
    project_parks?: number;

    @IsOptional()
    @IsNumber()
    project_pools?: number;

    @IsOptional()
    @IsNumber()
    project_night_clubs?: number;

    @IsOptional()
    @IsNumber()
    project_dicos?: number;

    @IsOptional()
    @IsNumber()
    project_discos?: number;

    @IsOptional()
    @IsNumber()
    project_multi_use_scenarios?: number;

    @IsOptional()
    @IsNumber()
    project_recreational_centers?: number;

    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsString()
    project_logo?: string | null;

    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsString()
    project_photo_1?: string | null;

    @IsOptional()
    @ValidateIf((_, value) => value !== null)
    @IsString()
    project_photo_2?: string | null;

    @IsOptional()
    @IsInt()
    project_status?: number;
}
