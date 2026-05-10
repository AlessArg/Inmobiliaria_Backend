import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateBankDto {
    @IsString()
    @IsNotEmpty()
    bank_name: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(99)
    bank_interest_rate?: number;
}
