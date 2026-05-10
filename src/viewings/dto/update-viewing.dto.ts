import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateViewingDto {
    @IsOptional()
    @IsString()
    viewing_date?: string;

    @IsOptional()
    viewing_status?: boolean | number;

    @IsOptional()
    @IsInt()
    @Min(1)
    id_lead?: number;
}
