import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LeadNotesController } from './lead-notes.controller';
import { LeadNotesService } from './lead-notes.service';

@Module({
    controllers: [LeadNotesController],
    providers: [LeadNotesService, ApiKeyGuard],
})
export class LeadNotesModule {}
