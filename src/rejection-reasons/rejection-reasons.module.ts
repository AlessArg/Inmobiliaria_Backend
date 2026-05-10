import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { RejectionReasonsController } from './rejection-reasons.controller';
import { RejectionReasonsService } from './rejection-reasons.service';

@Module({
    controllers: [RejectionReasonsController],
    providers: [RejectionReasonsService, ApiKeyGuard],
})
export class RejectionReasonsModule {}
