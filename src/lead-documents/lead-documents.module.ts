import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LeadDocumentsLegacyController } from './lead-documents-legacy.controller';
import { LeadDocumentsController } from './lead-documents.controller';
import { LeadDocumentsService } from './lead-documents.service';

@Module({
    controllers: [LeadDocumentsController, LeadDocumentsLegacyController],
    providers: [LeadDocumentsService, ApiKeyGuard],
})
export class LeadDocumentsModule {}
