import { IsInt, Min } from 'class-validator';

export class CreateTeamProjectDto {
    @IsInt()
    @Min(1)
    id_team: number;

    @IsInt()
    @Min(1)
    id_project: number;
}
