import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    IsString,
    Matches,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateMonthlyCloseDto {
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    month: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_monthly_close_status: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_closed_by?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_created_by: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}
