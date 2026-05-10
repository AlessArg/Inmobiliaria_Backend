import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateLeadDocumentationMessageDto } from './dto/create-lead-documentation-message.dto';
import { LeadDocumentationMessagesService } from './lead-documentation-messages.service';

@Controller('lead-documentation-messages')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class LeadDocumentationMessagesController {
    constructor(
        private readonly leadDocumentationMessagesService: LeadDocumentationMessagesService,
    ) {}

    @Get('lead/:id_lead')
    getMessagesByLeadId(@Param('id_lead') idLead: string) {
        const parsedIdLead = Number(idLead);
        if (!Number.isInteger(parsedIdLead) || parsedIdLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.leadDocumentationMessagesService.getMessagesByLeadId(
            parsedIdLead,
        );
    }

    @Post()
    createMessage(@Body() payload: CreateLeadDocumentationMessageDto) {
        return this.leadDocumentationMessagesService.createMessage(payload);
    }
}
