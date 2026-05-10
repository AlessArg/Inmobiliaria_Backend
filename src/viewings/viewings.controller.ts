import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingDto } from './dto/update-viewing.dto';
import { ViewingsService } from './viewings.service';

@Controller('viewings')
@UseGuards(ApiKeyGuard)
export class ViewingsController {
    constructor(private readonly viewingsService: ViewingsService) {}

    @Get()
    getAllViewings() {
        return this.viewingsService.getAllViewings();
    }

    @Get('lead/:id_lead')
    getViewingsByLeadId(@Param('id_lead') idLead: string) {
        const id = parseInt(idLead, 10);
        if (isNaN(id)) {
            throw new BadRequestException('id_lead must be a valid number');
        }

        return this.viewingsService.getViewingsByLeadId(id);
    }

    @Post()
    createViewing(@Body() payload: CreateViewingDto) {
        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        return this.viewingsService.createViewing(payload);
    }

    @Patch('lead/:id_lead')
    updateViewing(
        @Param('id_lead') idLead: string,
        @Body() payload: UpdateViewingDto,
    ) {
        const id = parseInt(idLead, 10);
        if (isNaN(id)) {
            throw new BadRequestException('id_lead must be a valid number');
        }

        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        return this.viewingsService.updateViewingByLeadId(id, payload);
    }

    @Delete('lead/:id_lead')
    deleteViewing(@Param('id_lead') idLead: string) {
        const id = parseInt(idLead, 10);
        if (isNaN(id)) {
            throw new BadRequestException('id_lead must be a valid number');
        }

        return this.viewingsService.deleteViewingByLeadId(id);
    }
}
