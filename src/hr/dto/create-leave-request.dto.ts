import { Type } from 'class-transformer';
import {
    IsDateString,
    IsInt,
    IsNumber,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateLeaveRequestDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_employee: number;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_leave_request_status: number;

    @IsDateString()
    start_date: string;

    @IsDateString()
    end_date: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    days_requested: number;

    @IsString()
    @MaxLength(500)
    reason: string;
}
