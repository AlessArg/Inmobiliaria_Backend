import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
} from 'class-validator';

export class UpdateLeadDto {
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lead_client_name?: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lead_client_phone?: string;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsEmail()
    @IsOptional()
    lead_client_email?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    total_amount?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    number_of_payments?: number | null;

    @IsInt()
    @Min(1)
    @IsOptional()
    id_lead_phase?: number;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_manager?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_supervisor?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_sales_person?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_project?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_house?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_bank?: number | null;
}
