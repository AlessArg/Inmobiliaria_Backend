import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateLeadPhaseHistoryDto } from './dto/create-lead-phase-history.dto';
import { UpdateLeadPhaseHistoryDto } from './dto/update-lead-phase-history.dto';

type LeadPhaseHistoryRow = RowDataPacket & {
    id_lead_phase_history: number;
    id_lead: number;
    id_lead_phase: number;
    lead_phase_entry_date: string;
    lead_phase_exit_date: string | null;
};

@Injectable()
export class LeadPhaseHistoryService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getLeadPhaseHistory() {
        return this.mySqlService.queryRows<LeadPhaseHistoryRow>(
            `
            SELECT *
            FROM lead_phase_history
            ORDER BY id_lead_phase_history DESC
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

    private async ensureLeadPhaseExists(idLeadPhase: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_lead_phase
            FROM lead_phases
            WHERE id_lead_phase = ?
            LIMIT 1
            `,
            [idLeadPhase],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Lead phase with id_lead_phase ${idLeadPhase} not found`,
            );
        }
    }

    private async getLeadPhaseHistoryByIdOrFail(idLeadPhaseHistory: number) {
        const rows = await this.mySqlService.queryRows<LeadPhaseHistoryRow>(
            `
            SELECT *
            FROM lead_phase_history
            WHERE id_lead_phase_history = ?
            LIMIT 1
            `,
            [idLeadPhaseHistory],
        );

        const leadPhaseHistory = rows[0];
        if (!leadPhaseHistory) {
            throw new NotFoundException(
                `Lead phase history with id_lead_phase_history ${idLeadPhaseHistory} not found`,
            );
        }

        return leadPhaseHistory;
    }

    async getLeadPhaseHistoryById(idLeadPhaseHistory: number) {
        if (!Number.isInteger(idLeadPhaseHistory) || idLeadPhaseHistory <= 0) {
            throw new BadRequestException(
                'id_lead_phase_history must be a positive integer',
            );
        }

        return this.getLeadPhaseHistoryByIdOrFail(idLeadPhaseHistory);
    }

    async getLeadPhaseHistoryByLeadId(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.mySqlService.queryRows<LeadPhaseHistoryRow>(
            `
            SELECT *
            FROM lead_phase_history
            WHERE id_lead = ?
            ORDER BY id_lead_phase_history DESC
            `,
            [idLead],
        );
    }

    async getLeadPhaseHistoryByLeadPhaseId(idLeadPhase: number) {
        if (!Number.isInteger(idLeadPhase) || idLeadPhase <= 0) {
            throw new BadRequestException(
                'id_lead_phase must be a positive integer',
            );
        }

        return this.mySqlService.queryRows<LeadPhaseHistoryRow>(
            `
            SELECT *
            FROM lead_phase_history
            WHERE id_lead_phase = ?
            ORDER BY id_lead_phase_history DESC
            `,
            [idLeadPhase],
        );
    }

    async createLeadPhaseHistory(payload: CreateLeadPhaseHistoryDto) {
        if (!Number.isInteger(payload.id_lead) || payload.id_lead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        if (!Number.isInteger(payload.id_lead_phase) || payload.id_lead_phase <= 0) {
            throw new BadRequestException('id_lead_phase must be a positive integer');
        }

        await this.ensureLeadExists(payload.id_lead);
        await this.ensureLeadPhaseExists(payload.id_lead_phase);

        const leadPhaseExitDate = payload.lead_phase_exit_date?.trim() || null;

        const result = await this.mySqlService.execute(
            `
            INSERT INTO lead_phase_history (
                id_lead,
                id_lead_phase,
                lead_phase_entry_date,
                lead_phase_exit_date
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                payload.id_lead,
                payload.id_lead_phase,
                payload.lead_phase_entry_date.trim(),
                leadPhaseExitDate,
            ],
        );

        return this.getLeadPhaseHistoryByIdOrFail(result.insertId);
    }

    async updateLeadPhaseHistory(
        idLeadPhaseHistory: number,
        payload: UpdateLeadPhaseHistoryDto,
    ) {
        if (!Number.isInteger(idLeadPhaseHistory) || idLeadPhaseHistory <= 0) {
            throw new BadRequestException(
                'id_lead_phase_history must be a positive integer',
            );
        }

        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException('Request body must be a valid JSON object');
        }

        await this.getLeadPhaseHistoryByIdOrFail(idLeadPhaseHistory);

        const body = payload as Record<string, unknown>;
        const updates: string[] = [];
        const params: Array<number | string | null> = [];
        const hasDefinedProperty = (key: string) =>
            Object.prototype.hasOwnProperty.call(body, key) &&
            body[key] !== undefined;

        if (hasDefinedProperty('id_lead')) {
            const idLead = body.id_lead;
            if (
                idLead !== null &&
                (typeof idLead !== 'number' ||
                    !Number.isInteger(idLead) ||
                    idLead <= 0)
            ) {
                throw new BadRequestException(
                    'id_lead must be null or a positive integer',
                );
            }

            if (typeof idLead === 'number') {
                await this.ensureLeadExists(idLead);
            }

            updates.push('id_lead = ?');
            params.push((idLead as number | null) ?? null);
        }

        if (hasDefinedProperty('id_lead_phase')) {
            const idLeadPhase = body.id_lead_phase;
            if (
                idLeadPhase !== null &&
                (typeof idLeadPhase !== 'number' ||
                    !Number.isInteger(idLeadPhase) ||
                    idLeadPhase <= 0)
            ) {
                throw new BadRequestException(
                    'id_lead_phase must be null or a positive integer',
                );
            }

            if (typeof idLeadPhase === 'number') {
                await this.ensureLeadPhaseExists(idLeadPhase);
            }

            updates.push('id_lead_phase = ?');
            params.push((idLeadPhase as number | null) ?? null);
        }

        if (hasDefinedProperty('lead_phase_entry_date')) {
            const leadPhaseEntryDate = body.lead_phase_entry_date;
            if (leadPhaseEntryDate === null) {
                updates.push('lead_phase_entry_date = ?');
                params.push(null);
            } else {
                if (
                    typeof leadPhaseEntryDate !== 'string' ||
                    !leadPhaseEntryDate.trim()
                ) {
                    throw new BadRequestException(
                        'lead_phase_entry_date must be null or a non-empty string',
                    );
                }

                updates.push('lead_phase_entry_date = ?');
                params.push(leadPhaseEntryDate.trim());
            }
        }

        if (hasDefinedProperty('lead_phase_exit_date')) {
            const leadPhaseExitDate = body.lead_phase_exit_date;
            if (leadPhaseExitDate === null) {
                updates.push('lead_phase_exit_date = ?');
                params.push(null);
            } else {
                if (
                    typeof leadPhaseExitDate !== 'string' ||
                    !leadPhaseExitDate.trim()
                ) {
                    throw new BadRequestException(
                        'lead_phase_exit_date must be null or a non-empty string',
                    );
                }

                updates.push('lead_phase_exit_date = ?');
                params.push(leadPhaseExitDate.trim());
            }
        }

        if (updates.length === 0) {
            throw new BadRequestException(
                'At least one valid field must be provided to update',
            );
        }

        params.push(idLeadPhaseHistory);

        await this.mySqlService.execute(
            `
            UPDATE lead_phase_history
            SET ${updates.join(', ')}
            WHERE id_lead_phase_history = ?
            `,
            params,
        );

        return this.getLeadPhaseHistoryByIdOrFail(idLeadPhaseHistory);
    }
}
