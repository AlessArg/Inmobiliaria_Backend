import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LeadDocumentationMessagesController } from './lead-documentation-messages.controller';
import { LeadDocumentationMessagesService } from './lead-documentation-messages.service';

@Module({
    controllers: [LeadDocumentationMessagesController],
    providers: [LeadDocumentationMessagesService, ApiKeyGuard],
})
export class LeadDocumentationMessagesModule {}
