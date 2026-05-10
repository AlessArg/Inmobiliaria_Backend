import {
    Body,
    Controller,
    Get,
    Patch,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateContactCenterLeadDto, CreateLeadDto, UpdateLeadDto } from './dto';
import { LeadsService } from './leads.service';

@Controller('leads')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class LeadsController {
    constructor(private readonly leadsService: LeadsService) {}

    @Get()
    getLeads() {
        return this.leadsService.getLeads();
    }

    @Get(':id_lead')
    getLeadsByIdLead(@Param('id_lead', ParseIntPipe) idLead: number) {
        return this.leadsService.getLeadsByIdLead(idLead);
    }

    @Post()
    createLead(@Body() payload: CreateLeadDto) {
        return this.leadsService.createLead(payload);
    }

    @Post('contact-center')
    createContactCenterLead(@Body() payload: CreateContactCenterLeadDto) {
        return this.leadsService.createContactCenterLead(payload);
    }

    @Patch(':id_lead')
    updateLead(
        @Param('id_lead', ParseIntPipe) idLead: number,
        @Body() payload: UpdateLeadDto,
    ) {
        return this.leadsService.updateLead(idLead, payload);
    }
}
