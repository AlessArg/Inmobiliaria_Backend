import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

type ProjectRow = RowDataPacket & {
    id_project: number;
    project_name?: string;
    project_logo?: string | null;
    project_photo_1?: string | null;
    project_photo_2?: string | null;
};

@Injectable()
export class ProjectsService {
    private discosColumnName: 'project_discos' | 'project_dicos' | null = null;

    constructor(
        private readonly mySqlService: MySqlService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    private hasOwnProperty(
        payload: Record<string, unknown>,
        key: string,
    ): boolean {
        return Object.prototype.hasOwnProperty.call(payload, key);
    }

    private validateRequiredString(
        payload: Record<string, unknown>,
        key: string,
    ): string {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException(`${key} must be a non-empty string`);
        }

        return value.trim();
    }

    private validateRequiredNumber(
        payload: Record<string, unknown>,
        key: string,
    ): number {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new BadRequestException(`${key} must be a valid number`);
        }

        return value;
    }

    private validateRequiredInteger(
        payload: Record<string, unknown>,
        key: string,
    ): number {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            !Number.isInteger(value)
        ) {
            throw new BadRequestException(`${key} must be a valid integer`);
        }

        return value;
    }

    private validateRequiredImageField(
        payload: Record<string, unknown>,
        key: string,
    ): string | null {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        if (value === null) {
            return null;
        }

        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException(
                `${key} must be null or a non-empty string`,
            );
        }

        return value.trim();
    }

    private validateOptionalImageField(
        payload: Record<string, unknown>,
        key: string,
    ): string | null | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (value === null) {
            return null;
        }

        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException(
                `${key} must be null or a non-empty string`,
            );
        }

        return value.trim();
    }

    private validateOptionalNumber(
        payload: Record<string, unknown>,
        key: string,
    ): number | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new BadRequestException(`${key} must be a valid number`);
        }

        return value;
    }

    private validateOptionalInteger(
        payload: Record<string, unknown>,
        key: string,
    ): number | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            !Number.isInteger(value)
        ) {
            throw new BadRequestException(`${key} must be a valid integer`);
        }

        return value;
    }

    private validateOptionalString(
        payload: Record<string, unknown>,
        key: string,
    ): string | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException(`${key} must be a non-empty string`);
        }

        return value.trim();
    }

    private async resolveDiscosColumnName() {
        if (this.discosColumnName) {
            return this.discosColumnName;
        }

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'projects'
              AND COLUMN_NAME IN ('project_discos', 'project_dicos')
            ORDER BY CASE
                WHEN COLUMN_NAME = 'project_discos' THEN 1
                WHEN COLUMN_NAME = 'project_dicos' THEN 2
                ELSE 3
            END
            LIMIT 1
            `,
            [],
        );

        const columnName = rows[0]?.COLUMN_NAME as
            | 'project_discos'
            | 'project_dicos'
            | undefined;

        if (!columnName) {
            throw new BadRequestException(
                'projects table must contain project_discos or project_dicos column',
            );
        }

        this.discosColumnName = columnName;
        return this.discosColumnName;
    }

    private async getProjectByIdOrFail(idProject: number) {
        const rows = await this.mySqlService.queryRows<ProjectRow>(
            `
            SELECT *
            FROM projects
            WHERE id_project = ?
            LIMIT 1
            `,
            [idProject],
        );

        const project = rows[0];
        if (!project) {
            throw new NotFoundException(
                `Project with id_project ${idProject} not found`,
            );
        }

        return project;
    }

    private async ensureProjectHasNoDependencies(idProject: number) {
        const housesCountRows = await this.mySqlService.queryRows<
            RowDataPacket & { total: number }
        >(
            `
            SELECT COUNT(*) AS total
            FROM houses
            WHERE id_project = ?
            `,
            [idProject],
        );

        const teamProjectsCountRows = await this.mySqlService.queryRows<
            RowDataPacket & { total: number }
        >(
            `
            SELECT COUNT(*) AS total
            FROM team_projects
            WHERE id_project = ?
            `,
            [idProject],
        );

        const housesCount = Number(housesCountRows[0]?.total ?? 0);
        const teamProjectsCount = Number(teamProjectsCountRows[0]?.total ?? 0);

        if (housesCount > 0 || teamProjectsCount > 0) {
            throw new BadRequestException(
                `Cannot delete project ${idProject} because it has related records (houses: ${housesCount}, team_projects: ${teamProjectsCount})`,
            );
        }
    }

    async createProject(payload: CreateProjectDto) {
        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        const body = payload as unknown as Record<string, unknown>;
        const discosColumnName = await this.resolveDiscosColumnName();

        const projectName = this.validateRequiredString(body, 'project_name');
        const projectLatitude = this.validateRequiredString(
            body,
            'project_latitude',
        );
        const projectLongitude = this.validateRequiredString(
            body,
            'project_longitude',
        );
        const projectCityLocation = this.validateRequiredInteger(
            body,
            'project_city_location',
        );
        const projectMunicipalityLocation = this.validateRequiredInteger(
            body,
            'project_municipality_location',
        );
        const projectLocationExtraDescription = this.validateRequiredString(
            body,
            'project_location_extra_description',
        );
        const projectConstructionStyle = this.validateRequiredInteger(
            body,
            'project_construction_style',
        );
        const projectDescription = this.validateRequiredString(
            body,
            'project_description',
        );
        const projectParks = this.validateRequiredNumber(body, 'project_parks');
        const projectPools = this.validateRequiredNumber(body, 'project_pools');
        const projectNightClubs = this.validateRequiredNumber(
            body,
            'project_night_clubs',
        );
        const projectMultiUseScenarios = this.validateRequiredNumber(
            body,
            'project_multi_use_scenarios',
        );
        const projectRecreationalCenters = this.validateRequiredNumber(
            body,
            'project_recreational_centers',
        );
        const projectLogo = this.validateRequiredImageField(body, 'project_logo');
        const projectPhoto1 = this.validateRequiredImageField(
            body,
            'project_photo_1',
        );
        const projectPhoto2 = this.validateRequiredImageField(
            body,
            'project_photo_2',
        );

        const uploadedProjectLogo = await this.cloudinaryService.uploadImageToFolder(
            projectLogo,
            'project_logos',
        );
        const uploadedProjectPhoto1 = await this.cloudinaryService.uploadImageToFolder(
            projectPhoto1,
            'project_photos',
        );
        const uploadedProjectPhoto2 = await this.cloudinaryService.uploadImageToFolder(
            projectPhoto2,
            'project_photos',
        );

        const discosValue =
            body.project_discos ?? body.project_dicos ?? Number.NaN;
        if (typeof discosValue !== 'number' || !Number.isFinite(discosValue)) {
            throw new BadRequestException(
                'project_discos (or project_dicos) must be a valid number',
            );
        }

        const statusFromPayload = body.project_status;
        const projectStatus =
            typeof statusFromPayload === 'number' &&
            Number.isFinite(statusFromPayload)
                ? statusFromPayload
                : 1;

        const insertResult = await this.mySqlService.execute(
            `
            INSERT INTO projects (
                project_name,
                project_latitude,
                project_longitude,
                project_city_location,
                project_municipality_location,
                project_location_extra_description,
                project_construction_style,
                project_description,
                project_status,
                project_parks,
                project_pools,
                project_night_clubs,
                ${discosColumnName},
                project_multi_use_scenarios,
                project_recreational_centers,
                project_logo,
                project_photo_1,
                project_photo_2
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                projectName,
                projectLatitude,
                projectLongitude,
                projectCityLocation,
                projectMunicipalityLocation,
                projectLocationExtraDescription,
                projectConstructionStyle,
                projectDescription,
                projectStatus,
                projectParks,
                projectPools,
                projectNightClubs,
                discosValue,
                projectMultiUseScenarios,
                projectRecreationalCenters,
                uploadedProjectLogo,
                uploadedProjectPhoto1,
                uploadedProjectPhoto2,
            ],
        );

        return this.getProjectByIdOrFail(insertResult.insertId);
    }

    async updateProject(idProject: number, payload: UpdateProjectDto) {
        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        const existingProject = await this.getProjectByIdOrFail(idProject);

        const body = payload as unknown as Record<string, unknown>;
        const discosColumnName = await this.resolveDiscosColumnName();
        const updates: string[] = [];
        const params: Array<string | number | null> = [];
        let uploadedProjectLogo: string | null | undefined;
        let uploadedProjectPhoto1: string | null | undefined;
        let uploadedProjectPhoto2: string | null | undefined;

        const maybeProjectName = this.validateOptionalString(body, 'project_name');
        if (maybeProjectName !== undefined) {
            updates.push('project_name = ?');
            params.push(maybeProjectName);
        }

        const maybeProjectLatitude = this.validateOptionalString(
            body,
            'project_latitude',
        );
        if (maybeProjectLatitude !== undefined) {
            updates.push('project_latitude = ?');
            params.push(maybeProjectLatitude);
        }

        const maybeProjectLongitude = this.validateOptionalString(
            body,
            'project_longitude',
        );
        if (maybeProjectLongitude !== undefined) {
            updates.push('project_longitude = ?');
            params.push(maybeProjectLongitude);
        }

        const maybeProjectCityLocation = this.validateOptionalInteger(
            body,
            'project_city_location',
        );
        if (maybeProjectCityLocation !== undefined) {
            updates.push('project_city_location = ?');
            params.push(maybeProjectCityLocation);
        }

        const maybeProjectMunicipalityLocation = this.validateOptionalInteger(
            body,
            'project_municipality_location',
        );
        if (maybeProjectMunicipalityLocation !== undefined) {
            updates.push('project_municipality_location = ?');
            params.push(maybeProjectMunicipalityLocation);
        }

        const maybeProjectLocationExtraDescription = this.validateOptionalString(
            body,
            'project_location_extra_description',
        );
        if (maybeProjectLocationExtraDescription !== undefined) {
            updates.push('project_location_extra_description = ?');
            params.push(maybeProjectLocationExtraDescription);
        }

        const maybeProjectConstructionStyle = this.validateOptionalInteger(
            body,
            'project_construction_style',
        );
        if (maybeProjectConstructionStyle !== undefined) {
            updates.push('project_construction_style = ?');
            params.push(maybeProjectConstructionStyle);
        }

        const maybeProjectDescription = this.validateOptionalString(
            body,
            'project_description',
        );
        if (maybeProjectDescription !== undefined) {
            updates.push('project_description = ?');
            params.push(maybeProjectDescription);
        }

        const maybeProjectStatus = this.validateOptionalNumber(
            body,
            'project_status',
        );
        if (maybeProjectStatus !== undefined) {
            updates.push('project_status = ?');
            params.push(maybeProjectStatus);
        }

        const maybeProjectParks = this.validateOptionalNumber(body, 'project_parks');
        if (maybeProjectParks !== undefined) {
            updates.push('project_parks = ?');
            params.push(maybeProjectParks);
        }

        const maybeProjectPools = this.validateOptionalNumber(body, 'project_pools');
        if (maybeProjectPools !== undefined) {
            updates.push('project_pools = ?');
            params.push(maybeProjectPools);
        }

        const maybeProjectNightClubs = this.validateOptionalNumber(
            body,
            'project_night_clubs',
        );
        if (maybeProjectNightClubs !== undefined) {
            updates.push('project_night_clubs = ?');
            params.push(maybeProjectNightClubs);
        }

        const maybeProjectDiscos =
            this.validateOptionalNumber(body, 'project_discos') ??
            this.validateOptionalNumber(body, 'project_dicos');
        if (maybeProjectDiscos !== undefined) {
            updates.push(`${discosColumnName} = ?`);
            params.push(maybeProjectDiscos);
        }

        const maybeProjectMultiUseScenarios = this.validateOptionalNumber(
            body,
            'project_multi_use_scenarios',
        );
        if (maybeProjectMultiUseScenarios !== undefined) {
            updates.push('project_multi_use_scenarios = ?');
            params.push(maybeProjectMultiUseScenarios);
        }

        const maybeProjectRecreationalCenters = this.validateOptionalNumber(
            body,
            'project_recreational_centers',
        );
        if (maybeProjectRecreationalCenters !== undefined) {
            updates.push('project_recreational_centers = ?');
            params.push(maybeProjectRecreationalCenters);
        }

        const maybeProjectLogo = this.validateOptionalImageField(
            body,
            'project_logo',
        );
        if (maybeProjectLogo !== undefined) {
            uploadedProjectLogo = await this.cloudinaryService.uploadImageToFolder(
                maybeProjectLogo,
                'project_logos',
            );
            updates.push('project_logo = ?');
            params.push(uploadedProjectLogo);
        }

        const maybeProjectPhoto1 = this.validateOptionalImageField(
            body,
            'project_photo_1',
        );
        if (maybeProjectPhoto1 !== undefined) {
            uploadedProjectPhoto1 = await this.cloudinaryService.uploadImageToFolder(
                maybeProjectPhoto1,
                'project_photos',
            );
            updates.push('project_photo_1 = ?');
            params.push(uploadedProjectPhoto1);
        }

        const maybeProjectPhoto2 = this.validateOptionalImageField(
            body,
            'project_photo_2',
        );
        if (maybeProjectPhoto2 !== undefined) {
            uploadedProjectPhoto2 = await this.cloudinaryService.uploadImageToFolder(
                maybeProjectPhoto2,
                'project_photos',
            );
            updates.push('project_photo_2 = ?');
            params.push(uploadedProjectPhoto2);
        }

        if (updates.length === 0) {
            throw new BadRequestException(
                'At least one valid field must be provided to update',
            );
        }

        params.push(idProject);

        await this.mySqlService.execute(
            `
            UPDATE projects
            SET ${updates.join(', ')}
            WHERE id_project = ?
            `,
            params,
        );

        if (
            uploadedProjectLogo !== undefined &&
            existingProject.project_logo &&
            existingProject.project_logo !== uploadedProjectLogo
        ) {
            await this.cloudinaryService.deleteImageByUrl(existingProject.project_logo);
        }

        if (
            uploadedProjectPhoto1 !== undefined &&
            existingProject.project_photo_1 &&
            existingProject.project_photo_1 !== uploadedProjectPhoto1
        ) {
            await this.cloudinaryService.deleteImageByUrl(
                existingProject.project_photo_1,
            );
        }

        if (
            uploadedProjectPhoto2 !== undefined &&
            existingProject.project_photo_2 &&
            existingProject.project_photo_2 !== uploadedProjectPhoto2
        ) {
            await this.cloudinaryService.deleteImageByUrl(
                existingProject.project_photo_2,
            );
        }

        return this.getProjectByIdOrFail(idProject);
    }

    async getProjects(filters: {
        name?: string;
        city?: number;
        municipality?: number;
        construction_style?: number;
    }) {
        const whereConditions: string[] = [];
        const params: Array<string | number> = [];

        if (filters.name) {
            const normalized = filters.name.trim();
            if (normalized) {
                whereConditions.push('project_name LIKE ?');
                params.push(`%${normalized}%`);
            }
        }

        if (filters.city !== undefined) {
            whereConditions.push('project_city_location = ?');
            params.push(filters.city);
        }

        if (filters.municipality !== undefined) {
            whereConditions.push('project_municipality_location = ?');
            params.push(filters.municipality);
        }

        if (filters.construction_style !== undefined) {
            whereConditions.push('project_construction_style = ?');
            params.push(filters.construction_style);
        }

        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

        const query = `
            SELECT *
            FROM projects
            ${whereClause}
            ORDER BY id_project DESC
        `;

        const rows = await this.mySqlService.queryRows<RowDataPacket>(query, params);
        return rows;
    }

    async deleteProject(idProject: number) {
        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        const existingProject = await this.getProjectByIdOrFail(idProject);
        await this.ensureProjectHasNoDependencies(idProject);

        const result = await this.mySqlService.execute(
            `
            DELETE FROM projects
            WHERE id_project = ?
            `,
            [idProject],
        );

        if (result.affectedRows === 0) {
            throw new NotFoundException(
                `Project with id_project ${idProject} not found`,
            );
        }

        await Promise.all([
            this.cloudinaryService.deleteImageByUrl(existingProject.project_logo),
            this.cloudinaryService.deleteImageByUrl(existingProject.project_photo_1),
            this.cloudinaryService.deleteImageByUrl(existingProject.project_photo_2),
        ]);

        return {
            id_project: idProject,
            deleted: true,
            message: 'Project deleted successfully',
        };
    }
}
