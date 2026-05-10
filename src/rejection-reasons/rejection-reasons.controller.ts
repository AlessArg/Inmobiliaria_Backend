import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { QueryRejectionReasonsDto } from './dto/query-rejection-reasons.dto';
import { RejectionReasonsService } from './rejection-reasons.service';

@Controller('rejection-reasons')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class RejectionReasonsController {
    constructor(private readonly rejectionReasonsService: RejectionReasonsService) {}

    @Get()
    getRejectionReasons(@Query() _query: QueryRejectionReasonsDto) {
        return this.rejectionReasonsService.getRejectionReasons();
    }
}
