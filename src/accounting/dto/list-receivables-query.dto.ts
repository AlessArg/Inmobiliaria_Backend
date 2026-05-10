import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class ListReceivablesQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_receivable_status?: number;

    @IsOptional()
    @IsDateString()
    due_from?: string;

    @IsOptional()
    @IsDateString()
    due_to?: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    search?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page_size?: number;
}
