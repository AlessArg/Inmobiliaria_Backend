import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryProjectsDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    city?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    municipality?: number;

    @IsOptional()
    @IsInt()
    @Min(1)
    construction_style?: number;
}
