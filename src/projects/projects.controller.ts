import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    ParseIntPipe,
    Param,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(ApiKeyGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) {}

    private parseOptionalIntegerQuery(
        value: string | undefined,
        fieldName: string,
    ): number | undefined {
        if (value === undefined) {
            return undefined;
        }

        const normalized = value.trim();
        if (!normalized) {
            return undefined;
        }

        const parsed = Number(normalized);
        if (!Number.isInteger(parsed)) {
            throw new BadRequestException(`${fieldName} must be a valid integer`);
        }

        return parsed;
    }

    @Post()
    createProject(@Body() payload: CreateProjectDto) {
        return this.projectsService.createProject(payload);
    }

    @Patch(':id_project')
    updateProject(
        @Param('id_project', ParseIntPipe) idProject: number,
        @Body() payload: UpdateProjectDto,
    ) {
        return this.projectsService.updateProject(idProject, payload);
    }

    @Get()
    getProjects(
        @Query('name') name?: string,
        @Query('city') city?: string,
        @Query('municipality') municipality?: string,
        @Query('construction_style') constructionStyle?: string,
    ) {
        const cityId = this.parseOptionalIntegerQuery(city, 'city');
        const municipalityId = this.parseOptionalIntegerQuery(
            municipality,
            'municipality',
        );
        const constructionStyleId = this.parseOptionalIntegerQuery(
            constructionStyle,
            'construction_style',
        );

        return this.projectsService.getProjects({
            name,
            city: cityId,
            municipality: municipalityId,
            construction_style: constructionStyleId,
        });
    }

    @Delete(':id_project')
    deleteProject(@Param('id_project', ParseIntPipe) idProject: number) {
        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        return this.projectsService.deleteProject(idProject);
    }
}
