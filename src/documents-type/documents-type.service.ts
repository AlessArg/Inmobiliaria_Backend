import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';

type DocumentTypeRow = RowDataPacket & {
    id_document_type: number;
    document_name: string | null;
};

@Injectable()
export class DocumentsTypeService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getDocumentsTypes() {
        return this.mySqlService.queryRows<DocumentTypeRow>(
            `
            SELECT *
            FROM documents_type
            ORDER BY id_document_type ASC
            `,
            [],
        );
    }

    async getDocumentsTypeById(idDocumentType: number) {
        if (!Number.isInteger(idDocumentType) || idDocumentType <= 0) {
            throw new BadRequestException(
                'id_document_type must be a positive integer',
            );
        }

        const rows = await this.mySqlService.queryRows<DocumentTypeRow>(
            `
            SELECT *
            FROM documents_type
            WHERE id_document_type = ?
            LIMIT 1
            `,
            [idDocumentType],
        );

        const documentType = rows[0];
        if (!documentType) {
            throw new NotFoundException(
                `Document type with id_document_type ${idDocumentType} not found`,
            );
        }

        return documentType;
    }
}
