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
import { CreateLeadPhaseHistoryDto } from './dto/create-lead-phase-history.dto';
import { UpdateLeadPhaseHistoryDto } from './dto/update-lead-phase-history.dto';
import { LeadPhaseHistoryService } from './lead-phase-history.service';

@Controller('lead-phase-history')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class LeadPhaseHistoryController {
    constructor(
        private readonly leadPhaseHistoryService: LeadPhaseHistoryService,
    ) {}

    @Get()
    getLeadPhaseHistory() {
        return this.leadPhaseHistoryService.getLeadPhaseHistory();
    }

    @Get('lead/:id_lead')
    getLeadPhaseHistoryByLeadId(
        @Param('id_lead', ParseIntPipe) idLead: number,
    ) {
        return this.leadPhaseHistoryService.getLeadPhaseHistoryByLeadId(idLead);
    }

    @Get('phase/:id_lead_phase')
    getLeadPhaseHistoryByLeadPhaseId(
        @Param('id_lead_phase', ParseIntPipe) idLeadPhase: number,
    ) {
        return this.leadPhaseHistoryService.getLeadPhaseHistoryByLeadPhaseId(
            idLeadPhase,
        );
    }

    @Get(':id_lead_phase_history')
    getLeadPhaseHistoryById(
        @Param('id_lead_phase_history', ParseIntPipe)
        idLeadPhaseHistory: number,
    ) {
        return this.leadPhaseHistoryService.getLeadPhaseHistoryById(
            idLeadPhaseHistory,
        );
    }

    @Post()
    createLeadPhaseHistory(@Body() payload: CreateLeadPhaseHistoryDto) {
        return this.leadPhaseHistoryService.createLeadPhaseHistory(payload);
    }

    @Patch(':id_lead_phase_history')
    updateLeadPhaseHistory(
        @Param('id_lead_phase_history', ParseIntPipe)
        idLeadPhaseHistory: number,
        @Body() payload: UpdateLeadPhaseHistoryDto,
    ) {
        return this.leadPhaseHistoryService.updateLeadPhaseHistory(
            idLeadPhaseHistory,
            payload,
        );
    }
}
