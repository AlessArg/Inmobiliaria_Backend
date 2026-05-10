import { IsOptional, IsString } from 'class-validator';

export class EmployeeLoginDto {
    @IsOptional()
    @IsString()
    user?: string;

    @IsOptional()
    @IsString()
    password?: string;

    @IsOptional()
    @IsString()
    employee_user?: string;

    @IsOptional()
    @IsString()
    employee_password?: string;
}
