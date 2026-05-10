import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Res,
    UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'stream';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateLeadDocumentDto } from './dto/create-lead-document.dto';
import { UpdateLeadDocumentDto } from './dto/update-lead-document.dto';
import { LeadDocumentsService } from './lead-documents.service';

@Controller('lead-documents')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class LeadDocumentsController {
    constructor(private readonly leadDocumentsService: LeadDocumentsService) {}

    @Get('lead/:id_lead')
    getLeadDocumentsByLeadId(@Param('id_lead') idLead: string) {
        const parsedIdLead = Number(idLead);
        if (!Number.isInteger(parsedIdLead) || parsedIdLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.leadDocumentsService.getLeadDocumentsByLeadId(parsedIdLead);
    }

    @Get(':id_lead_document/signed-url')
    getLeadDocumentSignedUrl(
        @Param('id_lead_document') idLeadDocument: string,
        @Query('expires_in') expiresIn?: string,
    ) {
        const parsedIdLeadDocument = Number(idLeadDocument);
        if (!Number.isInteger(parsedIdLeadDocument) || parsedIdLeadDocument <= 0) {
            throw new BadRequestException('id_lead_document must be a positive integer');
        }

        const parsedExpiresIn =
            expiresIn === undefined ? undefined : Number(expiresIn);

        if (
            expiresIn !== undefined &&
            (!Number.isInteger(parsedExpiresIn) || (parsedExpiresIn ?? 0) <= 0)
        ) {
            throw new BadRequestException('expires_in must be a positive integer');
        }

        return this.leadDocumentsService.getLeadDocumentSignedUrl(
            parsedIdLeadDocument,
            parsedExpiresIn,
        );
    }

    @Get(':id_lead_document/download-url')
    getLeadDocumentDownloadUrl(
        @Param('id_lead_document') idLeadDocument: string,
        @Query('expires_in') expiresIn?: string,
    ) {
        return this.getLeadDocumentSignedUrl(idLeadDocument, expiresIn);
    }

    @Get(':id_lead_document/download')
    async downloadLeadDocument(
        @Param('id_lead_document') idLeadDocument: string,
        @Res() response: Response,
    ) {
        const parsedIdLeadDocument = Number(idLeadDocument);
        if (!Number.isInteger(parsedIdLeadDocument) || parsedIdLeadDocument <= 0) {
            throw new BadRequestException('id_lead_document must be a positive integer');
        }

        const payload =
            await this.leadDocumentsService.getLeadDocumentBinaryPayload(
                parsedIdLeadDocument,
            );

        response.setHeader('Content-Type', payload.mime_type);
        response.setHeader(
            'Content-Disposition',
            `inline; filename="${payload.original_name}"`,
        );

        Readable.from(payload.file_buffer).pipe(response);
    }

    @Post()
    createLeadDocument(@Body() payload: CreateLeadDocumentDto) {
        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException('Request body must be a valid JSON object');
        }

        return this.leadDocumentsService.createLeadDocument(payload);
    }

    @Patch(':id_lead_document')
    updateLeadDocument(
        @Param('id_lead_document') idLeadDocument: string,
        @Body() payload: UpdateLeadDocumentDto,
    ) {
        const parsedIdLeadDocument = Number(idLeadDocument);
        if (!Number.isInteger(parsedIdLeadDocument) || parsedIdLeadDocument <= 0) {
            throw new BadRequestException(
                'id_lead_document must be a positive integer',
            );
        }

        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException('Request body must be a valid JSON object');
        }

        return this.leadDocumentsService.updateLeadDocument(
            parsedIdLeadDocument,
            payload,
        );
    }

    @Delete(':id_lead_document')
    deleteLeadDocument(@Param('id_lead_document') idLeadDocument: string) {
        const parsedIdLeadDocument = Number(idLeadDocument);
        if (!Number.isInteger(parsedIdLeadDocument) || parsedIdLeadDocument <= 0) {
            throw new BadRequestException(
                'id_lead_document must be a positive integer',
            );
        }

        return this.leadDocumentsService.deleteLeadDocument(parsedIdLeadDocument);
    }
}
