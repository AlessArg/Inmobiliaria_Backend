import { Type } from 'class-transformer';
import {
    IsInt,
    IsOptional,
    Matches,
    Min,
} from 'class-validator';

export class AttendanceSummaryQueryDto {
    @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    month: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_employee?: number;

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
