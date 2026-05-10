import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLeadPhaseHistoryDto {
    @IsInt()
    @IsNotEmpty()
    id_lead: number;

    @IsInt()
    @IsNotEmpty()
    id_lead_phase: number;

    @IsString()
    @IsNotEmpty()
    lead_phase_entry_date: string;

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    lead_phase_exit_date?: string;
}
