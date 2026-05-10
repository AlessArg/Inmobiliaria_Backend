import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { HousesController } from './houses.controller';
import { HousesService } from './houses.service';

@Module({
    controllers: [HousesController],
    providers: [HousesService, ApiKeyGuard],
})
export class HousesModule {}
