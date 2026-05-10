import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
    controllers: [TeamsController],
    providers: [TeamsService, ApiKeyGuard],
})
export class TeamsModule {}
