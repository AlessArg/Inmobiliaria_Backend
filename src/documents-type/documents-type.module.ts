import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { DocumentsTypeController } from './documents-type.controller';
import { DocumentsTypeService } from './documents-type.service';

@Module({
    controllers: [DocumentsTypeController],
    providers: [DocumentsTypeService, ApiKeyGuard],
})
export class DocumentsTypeModule {}
