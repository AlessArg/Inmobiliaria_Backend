import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LeadPhaseHistoryController } from './lead-phase-history.controller';
import { LeadPhaseHistoryService } from './lead-phase-history.service';

@Module({
    controllers: [LeadPhaseHistoryController],
    providers: [LeadPhaseHistoryService, ApiKeyGuard],
})
export class LeadPhaseHistoryModule {}
