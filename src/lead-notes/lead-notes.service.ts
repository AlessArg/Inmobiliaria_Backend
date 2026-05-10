import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto';

type LeadNoteRow = RowDataPacket & {
    id_note: number;
    note_text: string | null;
    id_lead: number | null;
};

@Injectable()
export class LeadNotesService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getLeadNotes(idLead?: number) {
        if (idLead !== undefined) {
            if (!Number.isInteger(idLead) || idLead <= 0) {
                throw new BadRequestException('id_lead must be a positive integer');
            }

            return this.mySqlService.queryRows<LeadNoteRow>(
                `
                SELECT *
                FROM lead_notes
                WHERE id_lead = ?
                ORDER BY id_note DESC
                `,
                [idLead],
            );
        }

        return this.mySqlService.queryRows<LeadNoteRow>(
            `
            SELECT *
            FROM lead_notes
            ORDER BY id_note DESC
            `,
            [],
        );
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
            throw new NotFoundException(`Lead with id_lead ${idLead} not found`);
        }
    }

    private async getLeadNoteByIdOrFail(idNote: number) {
        const rows = await this.mySqlService.queryRows<LeadNoteRow>(
            `
            SELECT *
            FROM lead_notes
            WHERE id_note = ?
            LIMIT 1
            `,
            [idNote],
        );

        const note = rows[0];
        if (!note) {
            throw new NotFoundException(`Lead note with id_note ${idNote} not found`);
        }

        return note;
    }

    async createLeadNote(payload: CreateLeadNoteDto) {
        if (!Number.isInteger(payload.id_lead) || payload.id_lead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureLeadExists(payload.id_lead);

        const result = await this.mySqlService.execute(
            `
            INSERT INTO lead_notes (
                note_text,
                id_lead
            )
            VALUES (?, ?)
            `,
            [payload.note_text.trim(), payload.id_lead],
        );

        return this.getLeadNoteByIdOrFail(result.insertId);
    }
}
