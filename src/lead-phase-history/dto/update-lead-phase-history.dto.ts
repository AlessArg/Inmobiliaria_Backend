import {
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
} from 'class-validator';

export class UpdateLeadPhaseHistoryDto {
    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_lead?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsInt()
    @Min(1)
    @IsOptional()
    id_lead_phase?: number | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lead_phase_entry_date?: string | null;

    @ValidateIf((_, value) => value !== null && value !== undefined)
    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lead_phase_exit_date?: string | null;
}
