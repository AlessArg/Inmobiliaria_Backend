import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';
import { LeadNotesService } from './lead-notes.service';

@Controller('lead-notes')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class LeadNotesController {
    constructor(private readonly leadNotesService: LeadNotesService) {}

    @Get()
    getLeadNotes(@Query('id_lead') idLead?: string) {
        if (idLead === undefined || !idLead.trim()) {
            return this.leadNotesService.getLeadNotes();
        }

        const parsedIdLead = Number(idLead);
        if (!Number.isInteger(parsedIdLead) || parsedIdLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.leadNotesService.getLeadNotes(parsedIdLead);
    }

    @Post()
    createLeadNote(@Body() payload: CreateLeadNoteDto) {
        return this.leadNotesService.createLeadNote(payload);
    }
}
