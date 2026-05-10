import {
    BadRequestException,
    Injectable,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { MySqlService } from '../database/mysql.service';
import { CreateLeadDocumentDto } from './dto/create-lead-document.dto';
import { UpdateLeadDocumentDto } from './dto/update-lead-document.dto';

type LeadDocumentRow = RowDataPacket & {
    id_lead_document: number;
    id_lead?: number | null;
    id_document_type?: number | null;
    document_photo?: string | null;
    document_original_name?: string | null;
    document_mime_type?: string | null;
    document_size_bytes?: number | null;
    cloud_public_id?: string | null;
    verified?: boolean | number | null;
    id_verified_by?: number | null;
    verified_at?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
};

type ColumnRow = RowDataPacket & {
    COLUMN_NAME: string;
};

@Injectable()
export class LeadDocumentsService {
    private leadDocumentsColumns: string[] | null = null;

    constructor(
        private readonly mySqlService: MySqlService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    private normalizeExpiresIn(expiresInSeconds?: number) {
        if (expiresInSeconds === undefined || expiresInSeconds === null) {
            return 15 * 60;
        }

        if (!Number.isInteger(expiresInSeconds) || expiresInSeconds <= 0) {
            throw new BadRequestException({
                code: 'DOCUMENT_SIGNED_URL_EXPIRES_INVALID',
                message: 'expires_in must be a positive integer in seconds',
                details: { expires_in: expiresInSeconds },
            });
        }

        return Math.max(30, Math.min(60 * 60, expiresInSeconds));
    }

    private resolveFileName(leadDocument: LeadDocumentRow) {
        const originalName = leadDocument.document_original_name?.trim();
        if (originalName) {
            return originalName;
        }

        const publicId = leadDocument.cloud_public_id?.trim();
        if (publicId) {
            const lastPart = publicId.split('/').pop();
            if (lastPart?.trim()) {
                return lastPart;
            }
        }

        const fileUrl = leadDocument.document_photo?.trim();
        if (fileUrl) {
            const withoutQuery = fileUrl.split('?')[0] ?? fileUrl;
            const lastPart = withoutQuery.split('/').pop();
            if (lastPart?.trim()) {
                return decodeURIComponent(lastPart);
            }
        }

        return `lead_document_${leadDocument.id_lead_document}.pdf`;
    }

    private resolveMimeType(leadDocument: LeadDocumentRow) {
        return leadDocument.document_mime_type?.trim() || 'application/pdf';
    }

    private async resolveLeadDocumentsColumns() {
        if (this.leadDocumentsColumns) {
            return this.leadDocumentsColumns;
        }

        const rows = await this.mySqlService.queryRows<ColumnRow>(
            `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'lead_documents'
            ORDER BY ORDINAL_POSITION ASC
            `,
            [],
        );

        const columns = rows
            .map((row) => row.COLUMN_NAME)
            .filter((columnName) => typeof columnName === 'string' && !!columnName);

        if (columns.length === 0) {
            throw new NotFoundException({
                code: 'LEAD_DOCUMENTS_TABLE_NOT_FOUND',
                message: 'Table lead_documents does not exist or has no columns',
                details: {},
            });
        }

        this.leadDocumentsColumns = columns;
        return columns;
    }

    private async ensureLeadExists(idLead: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_lead
            FROM leads
            WHERE id_lead = ?
            LIMIT 1
            `,
            [idLead],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'LEAD_NOT_FOUND',
                message: `Lead with id_lead ${idLead} not found`,
                details: { id_lead: idLead },
            });
        }
    }

    private async ensureDocumentTypeExists(idDocumentType: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_document_type
            FROM documents_type
            WHERE id_document_type = ?
            LIMIT 1
            `,
            [idDocumentType],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'DOCUMENT_TYPE_NOT_FOUND',
                message: `Document type with id_document_type ${idDocumentType} not found`,
                details: { id_document_type: idDocumentType },
            });
        }
    }

    private async ensureEmployeeExists(idEmployee: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_employee
            FROM employees
            WHERE id_employee = ?
            LIMIT 1
            `,
            [idEmployee],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'EMPLOYEE_NOT_FOUND',
                message: `Employee with id_employee ${idEmployee} not found`,
                details: { id_employee: idEmployee },
            });
        }
    }

    private async getLeadDocumentByIdOrFail(idLeadDocument: number) {
        const rows = await this.mySqlService.queryRows<LeadDocumentRow>(
            `
            SELECT *
            FROM lead_documents
            WHERE id_lead_document = ?
            LIMIT 1
            `,
            [idLeadDocument],
        );

        const leadDocument = rows[0];
        if (!leadDocument) {
            throw new NotFoundException({
                code: 'LEAD_DOCUMENT_NOT_FOUND',
                message: `Lead document with id_lead_document ${idLeadDocument} not found`,
                details: { id_lead_document: idLeadDocument },
            });
        }

        return leadDocument;
    }

    private async getLatestLeadDocumentByLeadAndType(
        idLead: number,
        idDocumentType: number | null,
    ) {
        const rows = await this.mySqlService.queryRows<LeadDocumentRow>(
            `
            SELECT *
            FROM lead_documents
            WHERE id_lead = ?
              AND ((? IS NULL AND id_document_type IS NULL) OR id_document_type = ?)
            ORDER BY id_lead_document DESC
            LIMIT 1
            `,
            [idLead, idDocumentType, idDocumentType],
        );

        return rows[0] ?? null;
    }

    private ensurePositiveInt(value: unknown, fieldName: string) {
        if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
            throw new BadRequestException({
                code: 'VALIDATION_POSITIVE_INTEGER_REQUIRED',
                message: `${fieldName} must be a positive integer`,
                details: { field: fieldName, value },
            });
        }
    }

    private isForbiddenCreateOrUpdateColumn(columnName: string) {
        return columnName === 'id_lead_document';
    }

    private validatePayloadKeys(
        payload: Record<string, unknown>,
        allowedColumns: readonly string[],
    ) {
        for (const key of Object.keys(payload)) {
            if (!allowedColumns.includes(key)) {
                throw new BadRequestException({
                    code: 'LEAD_DOCUMENT_FIELD_INVALID',
                    message: `Field ${key} is not a valid column in lead_documents`,
                    details: { field: key },
                });
            }

            if (this.isForbiddenCreateOrUpdateColumn(key)) {
                throw new BadRequestException({
                    code: 'LEAD_DOCUMENT_FIELD_FORBIDDEN',
                    message: 'id_lead_document cannot be set or updated',
                    details: { field: key },
                });
            }
        }
    }

    async getLeadDocumentsByLeadId(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException({
                code: 'LEAD_ID_INVALID',
                message: 'id_lead must be a positive integer',
                details: { id_lead: idLead },
            });
        }

        await this.ensureLeadExists(idLead);

        return this.mySqlService.queryRows<LeadDocumentRow>(
            `
            SELECT *
            FROM lead_documents
            WHERE id_lead = ?
            ORDER BY id_lead_document DESC
            `,
            [idLead],
        );
    }

    async createLeadDocument(payload: CreateLeadDocumentDto) {
        const body = payload as unknown as Record<string, unknown>;
        if (Object.keys(body).length === 0) {
            throw new BadRequestException({
                code: 'REQUEST_BODY_EMPTY',
                message: 'Request body cannot be empty',
                details: {},
            });
        }

        const columns = await this.resolveLeadDocumentsColumns();
        this.validatePayloadKeys(body, columns);

        if (!Object.prototype.hasOwnProperty.call(body, 'id_lead')) {
            throw new BadRequestException({
                code: 'LEAD_ID_REQUIRED',
                message: 'id_lead is required',
                details: {},
            });
        }

        this.ensurePositiveInt(body.id_lead, 'id_lead');
        await this.ensureLeadExists(body.id_lead as number);

        if (Object.prototype.hasOwnProperty.call(body, 'id_document_type')) {
            const idDocumentType = body.id_document_type;
            if (idDocumentType !== null) {
                this.ensurePositiveInt(idDocumentType, 'id_document_type');
                await this.ensureDocumentTypeExists(idDocumentType as number);
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, 'id_verified_by')) {
            const idVerifiedBy = body.id_verified_by;
            if (idVerifiedBy !== null && idVerifiedBy !== undefined) {
                this.ensurePositiveInt(idVerifiedBy, 'id_verified_by');
                await this.ensureEmployeeExists(idVerifiedBy as number);
            }
        }

        if (body.verified === true && body.verified_at === undefined) {
            body.verified_at = new Date();
        }

        const idLead = body.id_lead as number;
        const idDocumentType =
            body.id_document_type === undefined || body.id_document_type === null
                ? null
                : (body.id_document_type as number);

        const existingLeadDocument = await this.getLatestLeadDocumentByLeadAndType(
            idLead,
            idDocumentType,
        );

        if (existingLeadDocument) {
            return this.updateLeadDocument(
                existingLeadDocument.id_lead_document,
                payload as unknown as UpdateLeadDocumentDto,
            );
        }

        const insertColumns: string[] = [];
        const insertValues: unknown[] = [];

        for (const [key, value] of Object.entries(body)) {
            if (value === undefined) {
                continue;
            }

            insertColumns.push(key);
            insertValues.push(value);
        }

        if (insertColumns.length === 0) {
            throw new BadRequestException({
                code: 'LEAD_DOCUMENT_INSERT_FIELDS_EMPTY',
                message: 'No valid fields to insert',
                details: {},
            });
        }

        const placeholders = insertColumns.map(() => '?').join(', ');
        const sql = `
            INSERT INTO lead_documents (${insertColumns.join(', ')})
            VALUES (${placeholders})
        `;

        const result = await this.mySqlService.execute(sql, insertValues as any[]);
        return this.getLeadDocumentByIdOrFail(result.insertId);
    }

    async updateLeadDocument(
        idLeadDocument: number,
        payload: UpdateLeadDocumentDto,
    ) {
        if (!Number.isInteger(idLeadDocument) || idLeadDocument <= 0) {
            throw new BadRequestException({
                code: 'LEAD_DOCUMENT_ID_INVALID',
                message: 'id_lead_document must be a positive integer',
                details: { id_lead_document: idLeadDocument },
            });
        }

        const existingLeadDocument =
            await this.getLeadDocumentByIdOrFail(idLeadDocument);

        const body = payload as unknown as Record<string, unknown>;
        if (Object.keys(body).length === 0) {
            throw new BadRequestException({
                code: 'REQUEST_BODY_EMPTY',
                message: 'Request body cannot be empty',
                details: {},
            });
        }

        const columns = await this.resolveLeadDocumentsColumns();
        this.validatePayloadKeys(body, columns);

        if (Object.prototype.hasOwnProperty.call(body, 'id_lead')) {
            if (body.id_lead !== null && body.id_lead !== undefined) {
                this.ensurePositiveInt(body.id_lead, 'id_lead');
                await this.ensureLeadExists(body.id_lead as number);
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, 'id_document_type')) {
            if (
                body.id_document_type !== null &&
                body.id_document_type !== undefined
            ) {
                this.ensurePositiveInt(body.id_document_type, 'id_document_type');
                await this.ensureDocumentTypeExists(body.id_document_type as number);
            }
        }

        if (Object.prototype.hasOwnProperty.call(body, 'id_verified_by')) {
            if (body.id_verified_by !== null && body.id_verified_by !== undefined) {
                this.ensurePositiveInt(body.id_verified_by, 'id_verified_by');
                await this.ensureEmployeeExists(body.id_verified_by as number);
            }
        }

        if (
            Object.prototype.hasOwnProperty.call(body, 'verified') &&
            body.verified === true &&
            body.verified_at === undefined
        ) {
            body.verified_at = new Date();
        }

        const updates: string[] = [];
        const values: unknown[] = [];

        for (const [key, value] of Object.entries(body)) {
            if (value === undefined) {
                continue;
            }

            updates.push(`${key} = ?`);
            values.push(value);
        }

        if (updates.length === 0) {
            throw new BadRequestException({
                code: 'LEAD_DOCUMENT_UPDATE_FIELDS_EMPTY',
                message: 'No valid fields to update',
                details: {},
            });
        }

        values.push(idLeadDocument);

        await this.mySqlService.execute(
            `
            UPDATE lead_documents
            SET ${updates.join(', ')}
            WHERE id_lead_document = ?
            `,
            values as any[],
        );

        if (
            Object.prototype.hasOwnProperty.call(body, 'document_photo') &&
            body.document_photo !== undefined
        ) {
            const previousUrl =
                typeof existingLeadDocument.document_photo === 'string'
                    ? existingLeadDocument.document_photo.trim()
                    : '';
            const nextUrl =
                typeof body.document_photo === 'string'
                    ? body.document_photo.trim()
                    : '';

            if (previousUrl && nextUrl && previousUrl !== nextUrl) {
                await this.cloudinaryService.deleteImageByUrl(previousUrl);
            }
        }

        return this.getLeadDocumentByIdOrFail(idLeadDocument);
    }

    async deleteLeadDocument(idLeadDocument: number) {
        if (!Number.isInteger(idLeadDocument) || idLeadDocument <= 0) {
            throw new BadRequestException({
                code: 'LEAD_DOCUMENT_ID_INVALID',
                message: 'id_lead_document must be a positive integer',
                details: { id_lead_document: idLeadDocument },
            });
        }

        const existingLeadDocument =
            await this.getLeadDocumentByIdOrFail(idLeadDocument);

        await this.mySqlService.execute(
            `
            DELETE FROM lead_documents
            WHERE id_lead_document = ?
            `,
            [idLeadDocument],
        );

        await this.cloudinaryService.deleteImageByUrl(
            existingLeadDocument.document_photo,
        );

        return {
            message: `Lead document ${idLeadDocument} deleted successfully`,
        };
    }

    async getLeadDocumentSignedUrl(
        idLeadDocument: number,
        expiresInSeconds?: number,
    ) {
        if (!Number.isInteger(idLeadDocument) || idLeadDocument <= 0) {
            throw new BadRequestException({
                code: 'LEAD_DOCUMENT_ID_INVALID',
                message: 'id_lead_document must be a positive integer',
                details: { id_lead_document: idLeadDocument },
            });
        }

        const expiresIn = this.normalizeExpiresIn(expiresInSeconds);
        const leadDocument = await this.getLeadDocumentByIdOrFail(idLeadDocument);

        const cloudPublicId = leadDocument.cloud_public_id?.trim();
        const cloudResourceType =
            leadDocument.document_mime_type?.startsWith('image/')
                ? 'image'
                : 'raw';

        let signedUrlPayload:
            | {
                  url: string;
                  expires_at: number;
              }
            | null = null;

        if (cloudPublicId) {
            signedUrlPayload = this.cloudinaryService.buildSignedResourceUrl(
                cloudPublicId,
                {
                    resourceType: cloudResourceType,
                    expiresInSeconds: expiresIn,
                },
            );
        }

        if (!signedUrlPayload && leadDocument.document_photo?.trim()) {
            signedUrlPayload = this.cloudinaryService.buildSignedUrlFromAssetUrl(
                leadDocument.document_photo,
                {
                    expiresInSeconds: expiresIn,
                },
            );
        }

        if (!signedUrlPayload && leadDocument.document_photo?.trim()) {
            signedUrlPayload = {
                url: leadDocument.document_photo.trim(),
                expires_at: Math.floor(Date.now() / 1000) + expiresIn,
            };
        }

        if (!signedUrlPayload) {
            throw new NotFoundException({
                code: 'LEAD_DOCUMENT_FILE_NOT_FOUND',
                message: 'Lead document does not have a file URL/public ID',
                details: { id_lead_document: idLeadDocument },
            });
        }

        return {
            id_lead_document: idLeadDocument,
            url: signedUrlPayload.url,
            expires_at: signedUrlPayload.expires_at,
            mime_type: this.resolveMimeType(leadDocument),
            original_name: this.resolveFileName(leadDocument),
        };
    }

    async getLeadDocumentBinaryPayload(idLeadDocument: number) {
        const signed = await this.getLeadDocumentSignedUrl(idLeadDocument, 120);
        const upstreamResponse = await fetch(signed.url);

        if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
            throw new UnauthorizedException({
                code: 'LEAD_DOCUMENT_DOWNLOAD_UNAUTHORIZED',
                message: 'Document source denied access to the file',
                details: { id_lead_document: idLeadDocument },
            });
        }

        if (upstreamResponse.status === 404) {
            throw new NotFoundException({
                code: 'LEAD_DOCUMENT_SOURCE_NOT_FOUND',
                message: 'Document source file was not found',
                details: { id_lead_document: idLeadDocument },
            });
        }

        if (!upstreamResponse.ok) {
            throw new BadRequestException({
                code: 'LEAD_DOCUMENT_DOWNLOAD_FAILED',
                message: 'Failed to fetch lead document from source URL',
                details: {
                    id_lead_document: idLeadDocument,
                    upstream_status: upstreamResponse.status,
                },
            });
        }

        const fileBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

        return {
            file_buffer: fileBuffer,
            mime_type:
                signed.mime_type ||
                upstreamResponse.headers.get('content-type') ||
                'application/pdf',
            original_name: signed.original_name,
        };
    }
}
