import { IsInt, Min } from 'class-validator';

export class CreateRejectionReasonHistoryDto {
    @IsInt()
    @Min(1)
    id_rejection_reason: number;

    @IsInt()
    @Min(1)
    id_lead: number;
}
