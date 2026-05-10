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

export class CreateReceivableDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    invoice_number: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_lead?: number;

    @IsString()
    @IsNotEmpty()
    @MaxLength(120)
    client_name: string;

    @IsDateString()
    issue_date: string;

    @IsDateString()
    due_date: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    amount: number;

    @IsOptional()
    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    balance?: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_receivable_status: number;

    @IsOptional()
    @IsString()
    @Length(3, 3)
    currency_code?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_created_by: number;
}
