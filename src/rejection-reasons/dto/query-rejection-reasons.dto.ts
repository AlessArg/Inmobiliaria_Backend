import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryRejectionReasonsDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    id_rejection_reason?: number;

    @IsOptional()
    @IsString()
    rejection_reason_name?: string;
}
