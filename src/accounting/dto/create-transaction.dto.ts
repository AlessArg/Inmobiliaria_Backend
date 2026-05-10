import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateTransactionDto {
    @IsDateString()
    transaction_date: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_transaction_type: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_transaction_status: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_accounting_category?: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    concept: string;

    @IsOptional()
    @IsString()
    @MaxLength(150)
    counterparty?: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    amount: number;

    @IsOptional()
    @IsString()
    @Length(3, 3)
    currency_code?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_lead?: number;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    external_reference?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_created_by: number;
}
