import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Matches,
    Min,
} from 'class-validator';

export class CreateEmployeeDto {
    @IsString()
    @IsNotEmpty()
    employee_name: string;

    @IsInt()
    @Min(1)
    employee_age: number;

    @IsString()
    @IsNotEmpty()
    employee_job: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    employee_salary?: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    employe_salary?: number;

    @IsString()
    @Matches(/^(\d{1,2}):([0-5]\d):([0-5]\d)$/)
    employee_check_in: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    employee_photo?: string | null;

    @IsString()
    @IsNotEmpty()
    employee_user: string;

    @IsString()
    @IsNotEmpty()
    employee_password: string;

    @IsString()
    @IsNotEmpty()
    employee_email: string;

    @IsInt()
    @Min(1)
    id_role: number;
}
