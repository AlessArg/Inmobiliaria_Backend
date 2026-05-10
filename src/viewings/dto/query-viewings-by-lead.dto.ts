import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryViewingsByLeadDto {
    @IsOptional()
    @IsInt()
    @Min(1)
    id_lead?: number;
}
