import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateRejectionReasonHistoryDto } from './dto/create-rejection-reason-history.dto';

type RejectionReasonHistoryRow = RowDataPacket & {
    id_rejection_history: number;
    id_rejection_reason: number | null;
    id_lead: number | null;
};

@Injectable()
export class RejectionReasonsHistoryService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getRejectionReasonsHistory() {
        return this.mySqlService.queryRows<RejectionReasonHistoryRow>(
            `
            SELECT *
            FROM rejection_reasons_history
            ORDER BY id_rejection_history DESC
            `,
            [],
        );
    }

    async getRejectionReasonsHistoryByLeadId(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.mySqlService.queryRows<RejectionReasonHistoryRow>(
            `
            SELECT *
            FROM rejection_reasons_history
            WHERE id_lead = ?
            ORDER BY id_rejection_history DESC
            `,
            [idLead],
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

    private async ensureRejectionReasonExists(idRejectionReason: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_rejection_reason
            FROM rejection_reasons
            WHERE id_rejection_reason = ?
            LIMIT 1
            `,
            [idRejectionReason],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Rejection reason with id_rejection_reason ${idRejectionReason} not found`,
            );
        }
    }

    private async getRejectionReasonHistoryByIdOrFail(idRejectionHistory: number) {
        const rows = await this.mySqlService.queryRows<RejectionReasonHistoryRow>(
            `
            SELECT *
            FROM rejection_reasons_history
            WHERE id_rejection_history = ?
            LIMIT 1
            `,
            [idRejectionHistory],
        );

        const row = rows[0];
        if (!row) {
            throw new NotFoundException(
                `Rejection reason history with id_rejection_history ${idRejectionHistory} not found`,
            );
        }

        return row;
    }

    async createRejectionReasonHistory(payload: CreateRejectionReasonHistoryDto) {
        if (
            !Number.isInteger(payload.id_rejection_reason) ||
            payload.id_rejection_reason <= 0
        ) {
            throw new BadRequestException(
                'id_rejection_reason must be a positive integer',
            );
        }

        if (!Number.isInteger(payload.id_lead) || payload.id_lead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureRejectionReasonExists(payload.id_rejection_reason);
        await this.ensureLeadExists(payload.id_lead);

        const result = await this.mySqlService.execute(
            `
            INSERT INTO rejection_reasons_history (
                id_rejection_reason,
                id_lead
            )
            VALUES (?, ?)
            `,
            [payload.id_rejection_reason, payload.id_lead],
        );

        return this.getRejectionReasonHistoryByIdOrFail(result.insertId);
    }

    async deleteRejectionReasonHistory(idRejectionReason: number, idLead: number) {
        if (!Number.isInteger(idRejectionReason) || idRejectionReason <= 0) {
            throw new BadRequestException(
                'id_rejection_reason must be a positive integer',
            );
        }

        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        const result = await this.mySqlService.execute(
            `
            DELETE FROM rejection_reasons_history
            WHERE id_rejection_reason = ?
              AND id_lead = ?
            `,
            [idRejectionReason, idLead],
        );

        if (result.affectedRows === 0) {
            throw new NotFoundException(
                `No rejection_reasons_history records found for id_rejection_reason ${idRejectionReason} and id_lead ${idLead}`,
            );
        }

        return {
            id_rejection_reason: idRejectionReason,
            id_lead: idLead,
            deleted_rows: result.affectedRows,
            deleted: true,
            message: 'Rejection reason history deleted successfully',
        };
    }
}
