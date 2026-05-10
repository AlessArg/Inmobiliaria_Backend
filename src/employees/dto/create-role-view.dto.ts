import { IsIn, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateRoleViewDto {
    @IsInt()
    @Min(1)
    id_role_reference: number;

    @IsString()
    @IsNotEmpty()
    name_view: string;

    @IsInt()
    @IsIn([0, 1])
    enabled: number;

    @IsInt()
    @IsIn([0, 1])
    edit: number;
}
