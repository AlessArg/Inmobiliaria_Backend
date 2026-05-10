import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateLeadDocumentationMessageDto } from './dto/create-lead-documentation-message.dto';

type LeadDocumentationMessageRow = RowDataPacket & {
    id_lead_documentation_messages: number;
    lead_message: string | null;
    id_lead: number | null;
};

@Injectable()
export class LeadDocumentationMessagesService {
    constructor(private readonly mySqlService: MySqlService) {}

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
            throw new NotFoundException(`Lead with id_lead ${idLead} not found`);
        }
    }

    private async getMessageByIdOrFail(idMessage: number) {
        const rows =
            await this.mySqlService.queryRows<LeadDocumentationMessageRow>(
                `
            SELECT *
            FROM lead_documentation_messages
            WHERE id_lead_documentation_messages = ?
            LIMIT 1
            `,
                [idMessage],
            );

        const message = rows[0];
        if (!message) {
            throw new NotFoundException(
                `Lead documentation message with id_lead_documentation_messages ${idMessage} not found`,
            );
        }

        return message;
    }

    async getMessagesByLeadId(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureLeadExists(idLead);

        return this.mySqlService.queryRows<LeadDocumentationMessageRow>(
            `
            SELECT *
            FROM lead_documentation_messages
            WHERE id_lead = ?
            ORDER BY id_lead_documentation_messages ASC
            `,
            [idLead],
        );
    }

    async createMessage(payload: CreateLeadDocumentationMessageDto) {
        if (!Number.isInteger(payload.id_lead) || payload.id_lead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureLeadExists(payload.id_lead);

        const result = await this.mySqlService.execute(
            `
            INSERT INTO lead_documentation_messages (lead_message, id_lead)
            VALUES (?, ?)
            `,
            [payload.lead_message.trim(), payload.id_lead],
        );

        return this.getMessageByIdOrFail(result.insertId);
    }
}
