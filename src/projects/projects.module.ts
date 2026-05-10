import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
    controllers: [ProjectsController],
    providers: [ProjectsService, ApiKeyGuard],
})
export class ProjectsModule {}
