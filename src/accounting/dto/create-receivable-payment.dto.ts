import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateReceivablePaymentDto {
    @IsDateString()
    payment_date: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0.01)
    amount: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_payment_method: number;

    @IsOptional()
    @IsString()
    @MaxLength(120)
    reference_number?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_created_by: number;
}
