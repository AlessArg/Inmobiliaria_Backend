import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    MaxLength,
    Min,
    ValidateIf,
} from 'class-validator';

export class UpdateReceivableDto {
    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(50)
    invoice_number?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_lead?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(120)
    client_name?: string | null;

    @IsOptional()
    @IsDateString()
    issue_date?: string;

    @IsOptional()
    @IsDateString()
    due_date?: string;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    amount?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    balance?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_receivable_status?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @Length(3, 3)
    currency_code?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(500)
    notes?: string | null;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_updated_by: number;
}
