import {
    IsEmail,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreateContactCenterLeadDto {
    @IsString()
    @IsNotEmpty()
    lead_client_name: string;

    @IsString()
    @IsNotEmpty()
    lead_client_phone: string;

    @IsEmail()
    @IsOptional()
    lead_client_email?: string;

    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    @IsOptional()
    total_amount?: number;

    @IsInt()
    @IsOptional()
    number_of_payments?: number;

    @IsInt()
    @IsNotEmpty()
    id_lead_phase: number;

    @IsInt()
    @IsNotEmpty()
    id_contact_center: number;

    @IsInt()
    @IsOptional()
    id_manager?: number;

    @IsInt()
    @IsOptional()
    id_supervisor?: number;

    @IsInt()
    @IsOptional()
    id_project?: number;

    @IsInt()
    @IsOptional()
    id_house?: number;

    @IsInt()
    @IsOptional()
    id_bank?: number;
}
