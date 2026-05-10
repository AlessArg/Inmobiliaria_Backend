import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
} from 'class-validator';

export class UpdateEmployeeDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    employee_name?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    employee_age?: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    employee_job?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    employee_salary?: number;

    @IsOptional()
    @IsString()
    @Matches(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/)
    employee_check_in?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    employee_photo?: string | null;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    employee_user?: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    employee_email?: string;

    @IsOptional()
    @IsBoolean()
    activo?: boolean;

    @IsOptional()
    @IsInt()
    @Min(1)
    id_role?: number;
}
