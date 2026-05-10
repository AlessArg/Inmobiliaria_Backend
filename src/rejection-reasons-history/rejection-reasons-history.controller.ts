import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateRejectionReasonHistoryDto } from './dto/create-rejection-reason-history.dto';
import { RejectionReasonsHistoryService } from './rejection-reasons-history.service';

@Controller('rejection-reasons-history')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class RejectionReasonsHistoryController {
    constructor(
        private readonly rejectionReasonsHistoryService: RejectionReasonsHistoryService,
    ) {}

    @Post()
    createRejectionReasonHistory(
        @Body() payload: CreateRejectionReasonHistoryDto,
    ) {
        return this.rejectionReasonsHistoryService.createRejectionReasonHistory(
            payload,
        );
    }

    @Delete(':id_rejection_reason/lead/:id_lead')
    deleteRejectionReasonHistory(
        @Param('id_rejection_reason', ParseIntPipe) idRejectionReason: number,
        @Param('id_lead', ParseIntPipe) idLead: number,
    ) {
        return this.rejectionReasonsHistoryService.deleteRejectionReasonHistory(
            idRejectionReason,
            idLead,
        );
    }

    @Get()
    getRejectionReasonsHistory() {
        return this.rejectionReasonsHistoryService.getRejectionReasonsHistory();
    }

    @Get('lead/:id_lead')
    getRejectionReasonsHistoryByLeadId(
        @Param('id_lead', ParseIntPipe) idLead: number,
    ) {
        return this.rejectionReasonsHistoryService.getRejectionReasonsHistoryByLeadId(
            idLead,
        );
    }
}
