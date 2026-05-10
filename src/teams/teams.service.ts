import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { CreateTeamProjectDto } from './dto/create-team-project.dto';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

type TeamRow = RowDataPacket & {
    id_team: number;
    team_name: string;
    team_photo: string | null;
    status: number;
    fecha_creacion: string | null;
};

type TeamMemberRow = RowDataPacket & {
    id_team_member: number;
    id_team: number;
    id_employee: number;
    fecha_asignacion: string | null;
};

type TeamProjectRow = RowDataPacket & {
    id_team_project: number;
    id_team: number;
    id_project: number;
    fecha_asignacion: string | null;
};

type EmployeeWithRoleRow = RowDataPacket & {
    id_employee: number;
    employee_name: string;
    employee_email: string | null;
    employee_photo: string | null;
    id_role: number;
    role_name: string | null;
};

type ProjectRow = RowDataPacket & {
    id_project: number;
    project_name: string;
    [key: string]: unknown;
};

type LeadRoleType = 'manager' | 'supervisor' | 'seller' | 'other';

@Injectable()
export class TeamsService {
    private hasTeamProjectsFechaAsignacion: boolean | null = null;

    constructor(
        private readonly mySqlService: MySqlService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    private async teamProjectsHasFechaAsignacionColumn() {
        if (this.hasTeamProjectsFechaAsignacion !== null) {
            return this.hasTeamProjectsFechaAsignacion;
        }

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'team_projects'
              AND COLUMN_NAME = 'fecha_asignacion'
            LIMIT 1
            `,
            [],
        );

        this.hasTeamProjectsFechaAsignacion = Boolean(rows[0]);
        return this.hasTeamProjectsFechaAsignacion;
    }

    private normalizeStatus(value: unknown) {
        if (value === undefined) {
            return 1;
        }

        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }

        if (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            (value === 0 || value === 1)
        ) {
            return value;
        }

        throw new BadRequestException('status must be boolean or 0/1');
    }

    private normalizeTeamPhoto(value: unknown, fieldName: string) {
        if (value === undefined || value === null) {
            return null;
        }

        if (typeof value !== 'string') {
            throw new BadRequestException(`${fieldName} must be a string or null`);
        }

        const normalizedValue = value.trim();
        if (!normalizedValue) {
            throw new BadRequestException(
                `${fieldName} cannot be an empty string`,
            );
        }

        return normalizedValue;
    }

    private async ensureTeamExists(idTeam: number) {
        const rows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT id_team
            FROM teams
            WHERE id_team = ?
            LIMIT 1
            `,
            [idTeam],
        );

        if (!rows[0]) {
            throw new NotFoundException(`Team with id_team ${idTeam} was not found`);
        }
    }

    private async ensureEmployeeExists(idEmployee: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_employee
            FROM employees
            WHERE id_employee = ?
            LIMIT 1
            `,
            [idEmployee],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Employee with id_employee ${idEmployee} was not found`,
            );
        }
    }

    private async ensureProjectExists(idProject: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_project
            FROM projects
            WHERE id_project = ?
            LIMIT 1
            `,
            [idProject],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Project with id_project ${idProject} was not found`,
            );
        }
    }

    private assertPositiveInteger(value: number, fieldName: string) {
        if (!Number.isInteger(value) || value <= 0) {
            throw new BadRequestException(`${fieldName} must be a positive integer`);
        }
    }

    private normalizeRoleName(roleName: string | null | undefined) {
        return (roleName ?? '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase()
            .trim();
    }

    private getLeadRoleType(roleName: string | null | undefined): LeadRoleType {
        const normalizedRoleName = this.normalizeRoleName(roleName);

        if (normalizedRoleName.includes('gerente') || normalizedRoleName.includes('manager')) {
            return 'manager';
        }

        if (normalizedRoleName.includes('supervisor')) {
            return 'supervisor';
        }

        if (
            normalizedRoleName.includes('vendedor') ||
            normalizedRoleName.includes('seller') ||
            normalizedRoleName.includes('sales')
        ) {
            return 'seller';
        }

        return 'other';
    }

    private async getEmployeeWithRoleOrFail(idEmployee: number) {
        const rows = await this.mySqlService.queryRows<EmployeeWithRoleRow>(
            `
            SELECT
                e.id_employee,
                e.employee_name,
                e.employee_email,
                e.employee_photo,
                e.id_role,
                r.role_name
            FROM employees e
            LEFT JOIN roles r ON r.id_role = e.id_role
            WHERE e.id_employee = ?
            LIMIT 1
            `,
            [idEmployee],
        );

        const employee = rows[0];
        if (!employee) {
            throw new NotFoundException(
                `Employee with id_employee ${idEmployee} was not found`,
            );
        }

        return employee;
    }

    private filterEmployeesByRoleType(
        employees: EmployeeWithRoleRow[],
        roleType: LeadRoleType,
    ) {
        const seen = new Set<number>();
        const filtered = employees.filter((employee) => {
            if (seen.has(employee.id_employee)) {
                return false;
            }

            const employeeRoleType = this.getLeadRoleType(employee.role_name);
            if (employeeRoleType !== roleType) {
                return false;
            }

            seen.add(employee.id_employee);
            return true;
        });

        return filtered
            .sort((a, b) => a.employee_name.localeCompare(b.employee_name))
            .map((employee) => ({
                id_employee: employee.id_employee,
                employee_name: employee.employee_name,
                employee_email: employee.employee_email,
                employee_photo: employee.employee_photo,
                id_role: employee.id_role,
                role_name: employee.role_name,
            }));
    }

    private async getEmployeesFromActorTeamsByProject(
        actorId: number,
        idProject: number,
        requiredMemberId?: number,
        requiredSecondMemberId?: number,
    ) {
        return this.mySqlService.queryRows<EmployeeWithRoleRow>(
            `
            SELECT DISTINCT
                e.id_employee,
                e.employee_name,
                e.employee_email,
                e.employee_photo,
                e.id_role,
                r.role_name
            FROM team_members actor_tm
            INNER JOIN teams t ON t.id_team = actor_tm.id_team AND t.status = 1
            INNER JOIN team_projects tp ON tp.id_team = actor_tm.id_team AND tp.id_project = ?
            INNER JOIN team_members candidate_tm ON candidate_tm.id_team = actor_tm.id_team
            INNER JOIN employees e ON e.id_employee = candidate_tm.id_employee
            LEFT JOIN roles r ON r.id_role = e.id_role
            WHERE actor_tm.id_employee = ?
              AND (
                ? IS NULL OR EXISTS (
                    SELECT 1
                    FROM team_members req_tm
                    WHERE req_tm.id_team = actor_tm.id_team
                      AND req_tm.id_employee = ?
                )
              )
              AND (
                ? IS NULL OR EXISTS (
                    SELECT 1
                    FROM team_members req_tm2
                    WHERE req_tm2.id_team = actor_tm.id_team
                      AND req_tm2.id_employee = ?
                )
              )
            `,
            [
                idProject,
                actorId,
                requiredMemberId ?? null,
                requiredMemberId ?? null,
                requiredSecondMemberId ?? null,
                requiredSecondMemberId ?? null,
            ],
        );
    }

    private async getEmployeesFromAnyTeamByProject(
        idProject: number,
        requiredMemberId?: number,
        requiredSecondMemberId?: number,
    ) {
        return this.mySqlService.queryRows<EmployeeWithRoleRow>(
            `
            SELECT DISTINCT
                e.id_employee,
                e.employee_name,
                e.employee_email,
                e.employee_photo,
                e.id_role,
                r.role_name
            FROM team_projects tp
            INNER JOIN teams t ON t.id_team = tp.id_team AND t.status = 1
            INNER JOIN team_members candidate_tm ON candidate_tm.id_team = tp.id_team
            INNER JOIN employees e ON e.id_employee = candidate_tm.id_employee
            LEFT JOIN roles r ON r.id_role = e.id_role
            WHERE tp.id_project = ?
              AND (
                ? IS NULL OR EXISTS (
                    SELECT 1
                    FROM team_members req_tm
                    WHERE req_tm.id_team = tp.id_team
                      AND req_tm.id_employee = ?
                )
              )
              AND (
                ? IS NULL OR EXISTS (
                    SELECT 1
                    FROM team_members req_tm2
                    WHERE req_tm2.id_team = tp.id_team
                      AND req_tm2.id_employee = ?
                )
              )
            `,
            [
                idProject,
                requiredMemberId ?? null,
                requiredMemberId ?? null,
                requiredSecondMemberId ?? null,
                requiredSecondMemberId ?? null,
            ],
        );
    }

    async getAvailableProjectsByEmployee(idEmployee: number) {
        this.assertPositiveInteger(idEmployee, 'id_employee');

        const employee = await this.getEmployeeWithRoleOrFail(idEmployee);
        const roleType = this.getLeadRoleType(employee.role_name);

        if (roleType === 'other') {
            return this.mySqlService.queryRows<ProjectRow>(
                `
                SELECT DISTINCT p.*
                FROM projects p
                ORDER BY p.id_project DESC
                `,
                [],
            );
        }

        return this.mySqlService.queryRows<ProjectRow>(
            `
            SELECT DISTINCT p.*
            FROM team_members tm
            INNER JOIN teams t ON t.id_team = tm.id_team AND t.status = 1
            INNER JOIN team_projects tp ON tp.id_team = tm.id_team
            INNER JOIN projects p ON p.id_project = tp.id_project
            WHERE tm.id_employee = ?
            ORDER BY p.id_project DESC
            `,
            [idEmployee],
        );
    }

    async getLeadAssignmentRoleContext(idEmployee: number, idProject: number) {
        this.assertPositiveInteger(idEmployee, 'id_employee');
        this.assertPositiveInteger(idProject, 'id_project');

        await this.ensureProjectExists(idProject);

        const employee = await this.getEmployeeWithRoleOrFail(idEmployee);
        const roleType = this.getLeadRoleType(employee.role_name);

        const accessRows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT 1
            FROM team_members tm
            INNER JOIN teams t ON t.id_team = tm.id_team AND t.status = 1
            INNER JOIN team_projects tp ON tp.id_team = tm.id_team
            WHERE tm.id_employee = ?
              AND tp.id_project = ?
            LIMIT 1
            `,
            [idEmployee, idProject],
        );

        return {
            id_employee: employee.id_employee,
            employee_name: employee.employee_name,
            role_name: employee.role_name,
            role_type: roleType,
            id_project: idProject,
            has_project_in_teams: Boolean(accessRows[0]),
        };
    }

    async getLeadAssignmentManagers(idEmployee: number, idProject: number) {
        this.assertPositiveInteger(idEmployee, 'id_employee');
        this.assertPositiveInteger(idProject, 'id_project');

        await this.ensureProjectExists(idProject);

        const actor = await this.getEmployeeWithRoleOrFail(idEmployee);
        const actorRoleType = this.getLeadRoleType(actor.role_name);

        if (actorRoleType === 'manager') {
            return this.filterEmployeesByRoleType([actor], 'manager');
        }

        if (actorRoleType === 'supervisor' || actorRoleType === 'seller') {
            const employees = await this.getEmployeesFromActorTeamsByProject(
                idEmployee,
                idProject,
            );
            return this.filterEmployeesByRoleType(employees, 'manager');
        }

        const employees = await this.getEmployeesFromAnyTeamByProject(idProject);
        return this.filterEmployeesByRoleType(employees, 'manager');
    }

    async getLeadAssignmentSupervisors(
        idEmployee: number,
        idProject: number,
        idManager?: number,
    ) {
        this.assertPositiveInteger(idEmployee, 'id_employee');
        this.assertPositiveInteger(idProject, 'id_project');
        if (idManager !== undefined) {
            this.assertPositiveInteger(idManager, 'id_manager');
            const manager = await this.getEmployeeWithRoleOrFail(idManager);
            if (this.getLeadRoleType(manager.role_name) !== 'manager') {
                throw new BadRequestException('id_manager must belong to a manager role');
            }
        }

        await this.ensureProjectExists(idProject);

        const actor = await this.getEmployeeWithRoleOrFail(idEmployee);
        const actorRoleType = this.getLeadRoleType(actor.role_name);

        if (actorRoleType === 'manager') {
            const employees = await this.getEmployeesFromActorTeamsByProject(
                idEmployee,
                idProject,
                idManager,
            );
            return this.filterEmployeesByRoleType(employees, 'supervisor');
        }

        if (actorRoleType === 'supervisor') {
            return this.filterEmployeesByRoleType([actor], 'supervisor');
        }

        if (actorRoleType === 'seller') {
            const employees = await this.getEmployeesFromActorTeamsByProject(
                idEmployee,
                idProject,
                idManager,
            );
            return this.filterEmployeesByRoleType(employees, 'supervisor');
        }

        const employees = await this.getEmployeesFromAnyTeamByProject(
            idProject,
            idManager,
        );
        return this.filterEmployeesByRoleType(employees, 'supervisor');
    }

    async getLeadAssignmentVendors(
        idEmployee: number,
        idProject: number,
        idSupervisor?: number,
        idManager?: number,
    ) {
        this.assertPositiveInteger(idEmployee, 'id_employee');
        this.assertPositiveInteger(idProject, 'id_project');

        if (idSupervisor !== undefined) {
            this.assertPositiveInteger(idSupervisor, 'id_supervisor');
            const supervisor = await this.getEmployeeWithRoleOrFail(idSupervisor);
            if (this.getLeadRoleType(supervisor.role_name) !== 'supervisor') {
                throw new BadRequestException(
                    'id_supervisor must belong to a supervisor role',
                );
            }
        }

        if (idManager !== undefined) {
            this.assertPositiveInteger(idManager, 'id_manager');
            const manager = await this.getEmployeeWithRoleOrFail(idManager);
            if (this.getLeadRoleType(manager.role_name) !== 'manager') {
                throw new BadRequestException('id_manager must belong to a manager role');
            }
        }

        await this.ensureProjectExists(idProject);

        const actor = await this.getEmployeeWithRoleOrFail(idEmployee);
        const actorRoleType = this.getLeadRoleType(actor.role_name);

        if (actorRoleType === 'seller') {
            return this.filterEmployeesByRoleType([actor], 'seller');
        }

        if (actorRoleType === 'manager') {
            if (idSupervisor === undefined) {
                throw new BadRequestException(
                    'id_supervisor is required for manager vendor selection',
                );
            }

            const employees = await this.getEmployeesFromActorTeamsByProject(
                idEmployee,
                idProject,
                idSupervisor,
                idManager,
            );
            return this.filterEmployeesByRoleType(employees, 'seller');
        }

        if (actorRoleType === 'supervisor') {
            const employees = await this.getEmployeesFromActorTeamsByProject(
                idEmployee,
                idProject,
                idManager,
            );
            return this.filterEmployeesByRoleType(employees, 'seller');
        }

        if (idSupervisor === undefined) {
            throw new BadRequestException(
                'id_supervisor is required for non sales roles vendor selection',
            );
        }

        const employees = await this.getEmployeesFromAnyTeamByProject(
            idProject,
            idSupervisor,
            idManager,
        );
        return this.filterEmployeesByRoleType(employees, 'seller');
    }

    private async ensureTeamMemberExists(idTeamMember: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_team_member
            FROM team_members
            WHERE id_team_member = ?
            LIMIT 1
            `,
            [idTeamMember],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Team member with id_team_member ${idTeamMember} was not found`,
            );
        }
    }

    private async ensureTeamProjectExists(idTeamProject: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_team_project
            FROM team_projects
            WHERE id_team_project = ?
            LIMIT 1
            `,
            [idTeamProject],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Team project with id_team_project ${idTeamProject} was not found`,
            );
        }
    }

    async getAllTeams() {
        const rows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT id_team, team_name, team_photo, status, fecha_creacion
            FROM teams
            ORDER BY id_team DESC
            `,
            [],
        );

        return rows;
    }

    async getAllTeamMembers() {
        const rows = await this.mySqlService.queryRows<TeamMemberRow>(
            `
            SELECT id_team_member, id_team, id_employee, fecha_asignacion
            FROM team_members
            ORDER BY id_team_member DESC
            `,
            [],
        );

        return rows;
    }

    async getAllTeamProjects() {
        const hasFechaAsignacion =
            await this.teamProjectsHasFechaAsignacionColumn();

        const rows = await this.mySqlService.queryRows<TeamProjectRow>(
            `
            SELECT
                id_team_project,
                id_team,
                id_project,
                ${hasFechaAsignacion ? 'fecha_asignacion' : 'NULL AS fecha_asignacion'}
            FROM team_projects
            ORDER BY id_team_project DESC
            `,
            [],
        );

        return rows;
    }

    async getTeamsByEmployeeId(idEmployee: number) {
        if (!Number.isInteger(idEmployee) || idEmployee <= 0) {
            throw new BadRequestException('id_employee must be a positive integer');
        }

        await this.ensureEmployeeExists(idEmployee);

        const rows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT DISTINCT t.id_team, t.team_name, t.team_photo, t.status, t.fecha_creacion
            FROM teams t
            INNER JOIN team_members tm ON tm.id_team = t.id_team
            WHERE tm.id_employee = ?
            ORDER BY t.id_team DESC
            `,
            [idEmployee],
        );

        return rows;
    }

    async getTeamMembersByTeamId(idTeam: number) {
        await this.ensureTeamExists(idTeam);

        const rows = await this.mySqlService.queryRows<TeamMemberRow>(
            `
            SELECT id_team_member, id_team, id_employee, fecha_asignacion
            FROM team_members
            WHERE id_team = ?
            ORDER BY id_team_member DESC
            `,
            [idTeam],
        );

        return rows;
    }

    async getTeamProjectsByTeamId(idTeam: number) {
        await this.ensureTeamExists(idTeam);

        const hasFechaAsignacion =
            await this.teamProjectsHasFechaAsignacionColumn();

        const rows = await this.mySqlService.queryRows<TeamProjectRow>(
            `
            SELECT
                id_team_project,
                id_team,
                id_project,
                ${hasFechaAsignacion ? 'fecha_asignacion' : 'NULL AS fecha_asignacion'}
            FROM team_projects
            WHERE id_team = ?
            ORDER BY id_team_project DESC
            `,
            [idTeam],
        );

        return rows;
    }

    async createTeam(payload: CreateTeamDto) {
        if (!payload.team_name || !payload.team_name.trim()) {
            throw new BadRequestException('team_name is required');
        }

        const status = this.normalizeStatus(payload.status);
        const normalizedTeamName = payload.team_name.trim();
        const rawTeamPhoto = this.normalizeTeamPhoto(
            payload.team_photo,
            'team_photo',
        );
        const normalizedTeamPhoto = await this.cloudinaryService.uploadImageToFolder(
            rawTeamPhoto,
            'team_photos',
        );

        const insertResult = await this.mySqlService.execute(
            `
            INSERT INTO teams (team_name, team_photo, status, fecha_creacion)
            VALUES (?, ?, ?, CURDATE())
            `,
            [normalizedTeamName, normalizedTeamPhoto, status],
        );

        const rows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT id_team, team_name, team_photo, status, fecha_creacion
            FROM teams
            WHERE id_team = ?
            LIMIT 1
            `,
            [insertResult.insertId],
        );

        return rows[0];
    }

    async updateTeam(idTeam: number, payload: UpdateTeamDto) {
        if (!Number.isInteger(idTeam) || idTeam <= 0) {
            throw new BadRequestException('id_team must be a positive integer');
        }

        await this.ensureTeamExists(idTeam);

        const existingRows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT id_team, team_name, team_photo, status, fecha_creacion
            FROM teams
            WHERE id_team = ?
            LIMIT 1
            `,
            [idTeam],
        );
        const existingTeam = existingRows[0];

        const body = payload as Record<string, unknown>;

        const updates: string[] = [];
        const params: Array<string | number | null> = [];
        let uploadedTeamPhoto: string | null | undefined;

        if (Object.prototype.hasOwnProperty.call(body, 'team_name')) {
            const teamName = body.team_name;
            if (typeof teamName !== 'string' || !teamName.trim()) {
                throw new BadRequestException(
                    'team_name must be a non-empty string',
                );
            }

            updates.push('team_name = ?');
            params.push(teamName.trim());
        }

        if (Object.prototype.hasOwnProperty.call(body, 'team_photo')) {
            const rawTeamPhoto = this.normalizeTeamPhoto(
                body.team_photo,
                'team_photo',
            );
            uploadedTeamPhoto = await this.cloudinaryService.uploadImageToFolder(
                rawTeamPhoto,
                'team_photos',
            );
            updates.push('team_photo = ?');
            params.push(uploadedTeamPhoto);
        }

        if (Object.prototype.hasOwnProperty.call(body, 'team_status')) {
            const teamStatus = body.team_status;
            const normalizedStatus = this.normalizeStatus(teamStatus);
            updates.push('status = ?');
            params.push(normalizedStatus);
        }

        if (updates.length === 0) {
            throw new BadRequestException(
                'At least one field is required: team_name, team_photo or team_status',
            );
        }

        params.push(idTeam);

        await this.mySqlService.execute(
            `
            UPDATE teams
            SET ${updates.join(', ')}
            WHERE id_team = ?
            `,
            params,
        );

        if (
            uploadedTeamPhoto !== undefined &&
            existingTeam?.team_photo &&
            existingTeam.team_photo !== uploadedTeamPhoto
        ) {
            await this.cloudinaryService.deleteImageByUrl(existingTeam.team_photo);
        }

        const rows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT id_team, team_name, team_photo, status, fecha_creacion
            FROM teams
            WHERE id_team = ?
            LIMIT 1
            `,
            [idTeam],
        );

        return rows[0];
    }

    async addTeamMember(idTeam: number, payload: CreateTeamMemberDto) {
        const idEmployee = payload.id_employee;
        if (!Number.isInteger(idEmployee) || idEmployee <= 0) {
            throw new BadRequestException('id_employee must be a positive integer');
        }

        return this.createTeamMember({
            id_team: idTeam,
            id_employee: idEmployee,
        });
    }

    async createTeamMember(payload: CreateTeamMemberDto) {
        const idTeam = payload.id_team;
        if (!Number.isInteger(idTeam) || idTeam <= 0) {
            throw new BadRequestException('id_team must be a positive integer');
        }

        const idEmployee = payload.id_employee;
        if (!Number.isInteger(idEmployee) || idEmployee <= 0) {
            throw new BadRequestException('id_employee must be a positive integer');
        }

        await this.ensureTeamExists(idTeam);
        await this.ensureEmployeeExists(idEmployee);

        const existingRows = await this.mySqlService.queryRows<TeamMemberRow>(
            `
            SELECT id_team_member, id_team, id_employee
            FROM team_members
            WHERE id_team = ? AND id_employee = ?
            LIMIT 1
            `,
            [idTeam, idEmployee],
        );

        if (existingRows[0]) {
            throw new BadRequestException('Employee is already assigned to this team');
        }

        const insertResult = await this.mySqlService.execute(
            `
            INSERT INTO team_members (id_team, id_employee, fecha_asignacion)
            VALUES (?, ?, CURDATE())
            `,
            [idTeam, idEmployee],
        );

        const rows = await this.mySqlService.queryRows<TeamMemberRow>(
            `
            SELECT id_team_member, id_team, id_employee, fecha_asignacion
            FROM team_members
            WHERE id_team_member = ?
            LIMIT 1
            `,
            [insertResult.insertId],
        );

        return rows[0];
    }

    async addTeamProject(idTeam: number, payload: CreateTeamProjectDto) {
        const idProject = payload.id_project;
        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        return this.createTeamProject({
            id_team: idTeam,
            id_project: idProject,
        });
    }

    async createTeamProject(payload: CreateTeamProjectDto) {
        const idTeam = payload.id_team;
        if (!Number.isInteger(idTeam) || idTeam <= 0) {
            throw new BadRequestException('id_team must be a positive integer');
        }

        const idProject = payload.id_project;
        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        await this.ensureTeamExists(idTeam);
        await this.ensureProjectExists(idProject);

        const existingRows = await this.mySqlService.queryRows<TeamProjectRow>(
            `
            SELECT id_team_project, id_team, id_project
            FROM team_projects
            WHERE id_team = ? AND id_project = ?
            LIMIT 1
            `,
            [idTeam, idProject],
        );

        if (existingRows[0]) {
            throw new BadRequestException('Project is already assigned to this team');
        }

        const hasFechaAsignacion =
            await this.teamProjectsHasFechaAsignacionColumn();

        const insertResult = hasFechaAsignacion
            ? await this.mySqlService.execute(
                  `
                  INSERT INTO team_projects (id_team, id_project, fecha_asignacion)
                  VALUES (?, ?, CURDATE())
                  `,
                  [idTeam, idProject],
              )
            : await this.mySqlService.execute(
                  `
                  INSERT INTO team_projects (id_team, id_project)
                  VALUES (?, ?)
                  `,
                  [idTeam, idProject],
              );

        const rows = await this.mySqlService.queryRows<TeamProjectRow>(
            `
            SELECT
                id_team_project,
                id_team,
                id_project,
                ${hasFechaAsignacion ? 'fecha_asignacion' : 'NULL AS fecha_asignacion'}
            FROM team_projects
            WHERE id_team_project = ?
            LIMIT 1
            `,
            [insertResult.insertId],
        );

        return rows[0];
    }

    async deleteTeam(idTeam: number) {
        if (!Number.isInteger(idTeam) || idTeam <= 0) {
            throw new BadRequestException('id_team must be a positive integer');
        }

        await this.ensureTeamExists(idTeam);

        const rows = await this.mySqlService.queryRows<TeamRow>(
            `
            SELECT id_team, team_name, team_photo, status, fecha_creacion
            FROM teams
            WHERE id_team = ?
            LIMIT 1
            `,
            [idTeam],
        );
        const existingTeam = rows[0];

        await this.mySqlService.execute(
            `
            DELETE FROM team_members
            WHERE id_team = ?
            `,
            [idTeam],
        );

        await this.mySqlService.execute(
            `
            DELETE FROM team_projects
            WHERE id_team = ?
            `,
            [idTeam],
        );

        await this.mySqlService.execute(
            `
            DELETE FROM teams
            WHERE id_team = ?
            `,
            [idTeam],
        );

        await this.cloudinaryService.deleteImageByUrl(existingTeam?.team_photo);

        return { message: `Team ${idTeam} deleted successfully` };
    }

    async deleteTeamMember(idTeamMember: number) {
        if (!Number.isInteger(idTeamMember) || idTeamMember <= 0) {
            throw new BadRequestException(
                'id_team_member must be a positive integer',
            );
        }

        await this.ensureTeamMemberExists(idTeamMember);

        await this.mySqlService.execute(
            `
            DELETE FROM team_members
            WHERE id_team_member = ?
            `,
            [idTeamMember],
        );

        return { message: `Team member ${idTeamMember} deleted successfully` };
    }

    async deleteTeamMemberByTeamAndEmployee(
        idTeam: number,
        idEmployee: number,
    ) {
        if (!Number.isInteger(idTeam) || idTeam <= 0) {
            throw new BadRequestException('id_team must be a positive integer');
        }

        if (!Number.isInteger(idEmployee) || idEmployee <= 0) {
            throw new BadRequestException('id_employee must be a positive integer');
        }

        await this.ensureTeamExists(idTeam);
        await this.ensureEmployeeExists(idEmployee);

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_team_member
            FROM team_members
            WHERE id_team = ? AND id_employee = ?
            LIMIT 1
            `,
            [idTeam, idEmployee],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Relation not found for id_team ${idTeam} and id_employee ${idEmployee}`,
            );
        }

        await this.mySqlService.execute(
            `
            DELETE FROM team_members
            WHERE id_team = ? AND id_employee = ?
            `,
            [idTeam, idEmployee],
        );

        return {
            message: `Member ${idEmployee} removed from team ${idTeam} successfully`,
        };
    }

    async deleteTeamProject(idTeamProject: number) {
        if (!Number.isInteger(idTeamProject) || idTeamProject <= 0) {
            throw new BadRequestException(
                'id_team_project must be a positive integer',
            );
        }

        await this.ensureTeamProjectExists(idTeamProject);

        await this.mySqlService.execute(
            `
            DELETE FROM team_projects
            WHERE id_team_project = ?
            `,
            [idTeamProject],
        );

        return { message: `Team project ${idTeamProject} deleted successfully` };
    }

    async deleteTeamProjectByTeamAndProject(idTeam: number, idProject: number) {
        if (!Number.isInteger(idTeam) || idTeam <= 0) {
            throw new BadRequestException('id_team must be a positive integer');
        }

        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        await this.ensureTeamExists(idTeam);
        await this.ensureProjectExists(idProject);

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_team_project
            FROM team_projects
            WHERE id_team = ? AND id_project = ?
            LIMIT 1
            `,
            [idTeam, idProject],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Relation not found for id_team ${idTeam} and id_project ${idProject}`,
            );
        }

        await this.mySqlService.execute(
            `
            DELETE FROM team_projects
            WHERE id_team = ? AND id_project = ?
            `,
            [idTeam, idProject],
        );

        return {
            message: `Project ${idProject} removed from team ${idTeam} successfully`,
        };
    }
}
