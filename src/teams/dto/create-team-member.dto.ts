import { IsInt, Min } from 'class-validator';

export class CreateTeamMemberDto {
    @IsInt()
    @Min(1)
    id_team: number;

    @IsInt()
    @Min(1)
    id_employee: number;
}
