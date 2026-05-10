import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RejectionReasonsHistoryController } from './rejection-reasons-history.controller';
import { RejectionReasonsHistoryService } from './rejection-reasons-history.service';

@Module({
    controllers: [RejectionReasonsHistoryController],
    providers: [RejectionReasonsHistoryService, ApiKeyGuard],
})
export class RejectionReasonsHistoryModule {}
