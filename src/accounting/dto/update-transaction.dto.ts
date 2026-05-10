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

export class UpdateTransactionDto {
    @IsOptional()
    @IsDateString()
    transaction_date?: string;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_transaction_type?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_transaction_status?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_accounting_category?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(255)
    concept?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(150)
    counterparty?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    amount?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @Length(3, 3)
    currency_code?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_lead?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(120)
    external_reference?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @MaxLength(500)
    notes?: string | null;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_updated_by: number;
}
