import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Query,
    ParseIntPipe,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import {
    TeamsService,
} from './teams.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { CreateTeamProjectDto } from './dto/create-team-project.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Controller('teams')
@UseGuards(ApiKeyGuard)
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) {}

    private parseOptionalPositiveInt(value: string | undefined, fieldName: string) {
        if (value === undefined) {
            return undefined;
        }

        const parsed = Number(value);
        if (!Number.isInteger(parsed) || parsed <= 0) {
            throw new BadRequestException(
                `${fieldName} must be a positive integer`,
            );
        }

        return parsed;
    }

    @Get()
    getAllTeams() {
        return this.teamsService.getAllTeams();
    }

    @Get('members')
    getAllTeamMembers() {
        return this.teamsService.getAllTeamMembers();
    }

    @Get('projects')
    getAllTeamProjects() {
        return this.teamsService.getAllTeamProjects();
    }

    @Get('employee/:id_employee')
    getTeamsByEmployeeId(@Param('id_employee', ParseIntPipe) idEmployee: number) {
        return this.teamsService.getTeamsByEmployeeId(idEmployee);
    }

    @Get('lead-assignment/:id_employee/projects')
    getAvailableProjectsByEmployee(
        @Param('id_employee', ParseIntPipe) idEmployee: number,
    ) {
        return this.teamsService.getAvailableProjectsByEmployee(idEmployee);
    }

    @Get('lead-assignment/:id_employee/project/:id_project/role-context')
    getLeadAssignmentRoleContext(
        @Param('id_employee', ParseIntPipe) idEmployee: number,
        @Param('id_project', ParseIntPipe) idProject: number,
    ) {
        return this.teamsService.getLeadAssignmentRoleContext(
            idEmployee,
            idProject,
        );
    }

    @Get('lead-assignment/:id_employee/project/:id_project/managers')
    getLeadAssignmentManagers(
        @Param('id_employee', ParseIntPipe) idEmployee: number,
        @Param('id_project', ParseIntPipe) idProject: number,
    ) {
        return this.teamsService.getLeadAssignmentManagers(idEmployee, idProject);
    }

    @Get('lead-assignment/:id_employee/project/:id_project/supervisors')
    getLeadAssignmentSupervisors(
        @Param('id_employee', ParseIntPipe) idEmployee: number,
        @Param('id_project', ParseIntPipe) idProject: number,
        @Query('id_manager') idManager?: string,
    ) {
        return this.teamsService.getLeadAssignmentSupervisors(
            idEmployee,
            idProject,
            this.parseOptionalPositiveInt(idManager, 'id_manager'),
        );
    }

    @Get('lead-assignment/:id_employee/project/:id_project/vendors')
    getLeadAssignmentVendors(
        @Param('id_employee', ParseIntPipe) idEmployee: number,
        @Param('id_project', ParseIntPipe) idProject: number,
        @Query('id_supervisor') idSupervisor?: string,
        @Query('id_manager') idManager?: string,
    ) {
        return this.teamsService.getLeadAssignmentVendors(
            idEmployee,
            idProject,
            this.parseOptionalPositiveInt(idSupervisor, 'id_supervisor'),
            this.parseOptionalPositiveInt(idManager, 'id_manager'),
        );
    }

    @Get(':id_team/members')
    getTeamMembersByTeamId(@Param('id_team', ParseIntPipe) idTeam: number) {
        return this.teamsService.getTeamMembersByTeamId(idTeam);
    }

    @Get(':id_team/projects')
    getTeamProjectsByTeamId(@Param('id_team', ParseIntPipe) idTeam: number) {
        return this.teamsService.getTeamProjectsByTeamId(idTeam);
    }

    @Post()
    createTeam(@Body() payload: CreateTeamDto) {
        return this.teamsService.createTeam(payload);
    }

    @Post('members')
    createTeamMember(@Body() payload: CreateTeamMemberDto) {
        return this.teamsService.createTeamMember(payload);
    }

    @Post('projects')
    createTeamProject(@Body() payload: CreateTeamProjectDto) {
        return this.teamsService.createTeamProject(payload);
    }

    @Patch(':id_team')
    updateTeam(
        @Param('id_team', ParseIntPipe) idTeam: number,
        @Body() payload: UpdateTeamDto,
    ) {
        return this.teamsService.updateTeam(idTeam, payload);
    }

    @Delete(':id_team')
    deleteTeam(@Param('id_team', ParseIntPipe) idTeam: number) {
        return this.teamsService.deleteTeam(idTeam);
    }

    @Delete('members/:id_team_member')
    deleteTeamMember(@Param('id_team_member', ParseIntPipe) idTeamMember: number) {
        return this.teamsService.deleteTeamMember(idTeamMember);
    }

    @Delete(':id_team/members/:id_employee')
    deleteTeamMemberByTeamAndEmployee(
        @Param('id_team', ParseIntPipe) idTeam: number,
        @Param('id_employee', ParseIntPipe) idEmployee: number,
    ) {
        return this.teamsService.deleteTeamMemberByTeamAndEmployee(
            idTeam,
            idEmployee,
        );
    }

    @Delete('projects/:id_team_project')
    deleteTeamProject(@Param('id_team_project', ParseIntPipe) idTeamProject: number) {
        return this.teamsService.deleteTeamProject(idTeamProject);
    }

    @Delete(':id_team/projects/:id_project')
    deleteTeamProjectByTeamAndProject(
        @Param('id_team', ParseIntPipe) idTeam: number,
        @Param('id_project', ParseIntPipe) idProject: number,
    ) {
        return this.teamsService.deleteTeamProjectByTeamAndProject(
            idTeam,
            idProject,
        );
    }

}
