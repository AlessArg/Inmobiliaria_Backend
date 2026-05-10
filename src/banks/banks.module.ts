import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { BanksController } from './banks.controller';
import { BanksService } from './banks.service';

@Module({
    controllers: [BanksController],
    providers: [BanksService, ApiKeyGuard],
})
export class BanksModule {}
