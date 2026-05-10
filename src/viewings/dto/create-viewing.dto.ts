import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateViewingDto {
    @IsOptional()
    @IsString()
    viewing_date?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    id_lead?: number;
}
