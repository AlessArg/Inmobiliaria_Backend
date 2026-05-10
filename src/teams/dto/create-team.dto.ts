import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTeamDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    team_name: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    team_photo?: string | null;

    @IsOptional()
    @IsIn([0, 1, true, false])
    status?: boolean | number;
}
