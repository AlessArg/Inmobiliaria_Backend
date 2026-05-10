import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DocumentsTypeService } from './documents-type.service';

@Controller('documents-type')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class DocumentsTypeController {
    constructor(private readonly documentsTypeService: DocumentsTypeService) {}

    @Get()
    getDocumentsTypes() {
        return this.documentsTypeService.getDocumentsTypes();
    }

    @Get(':id_document_type')
    getDocumentsTypeById(
        @Param('id_document_type', ParseIntPipe) idDocumentType: number,
    ) {
        return this.documentsTypeService.getDocumentsTypeById(idDocumentType);
    }
}
