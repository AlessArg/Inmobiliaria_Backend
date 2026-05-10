import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class ListTransactionsQueryDto {
    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_transaction_type?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_transaction_status?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_accounting_category?: number;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_lead?: number;

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
