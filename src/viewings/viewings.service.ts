import {
    BadRequestException,
    Injectable,
    NotFoundException,
    OnModuleDestroy,
    OnModuleInit,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateViewingDto } from './dto/create-viewing.dto';
import { UpdateViewingDto } from './dto/update-viewing.dto';

type ViewingRow = RowDataPacket & {
    id_viewing: number;
    viewing_date: string;
    viewing_status: number;
    id_lead: number;
};

type LeadPhaseRow = RowDataPacket & {
    id_lead_phase: number;
    phase_label?: string | null;
};

@Injectable()
export class ViewingsService implements OnModuleInit, OnModuleDestroy {
    private readonly citaPhaseNameCandidates = ['cita', 'citas'];
    private readonly visitaPhaseNameCandidates = ['visita', 'visitas'];
    private readonly pollIntervalMs = 60_000;
    private transitionTimer: NodeJS.Timeout | null = null;
    private isProcessingTransitions = false;
    private leadPhaseNameColumn: string | null = null;
    private cachedCitaPhaseIds: number[] | null = null;
    private cachedVisitaPhaseId: number | null = null;

    constructor(private readonly mySqlService: MySqlService) {}

    onModuleInit() {
        this.triggerDueViewingsTransition();
        this.transitionTimer = setInterval(() => {
            this.triggerDueViewingsTransition();
        }, this.pollIntervalMs);
    }

    onModuleDestroy() {
        if (this.transitionTimer) {
            clearInterval(this.transitionTimer);
            this.transitionTimer = null;
        }
    }

    private triggerDueViewingsTransition() {
        if (this.isProcessingTransitions) {
            return;
        }

        this.isProcessingTransitions = true;
        this.processDueViewingsTransition()
            .catch(() => {
                return;
            })
            .finally(() => {
                this.isProcessingTransitions = false;
            });
    }

    private async processDueViewingsTransition() {
        const dueViewings = await this.mySqlService.queryRows<ViewingRow>(
            `
            SELECT id_viewing, viewing_date, viewing_status, id_lead
            FROM viewings
            WHERE viewing_date <= NOW()
              AND COALESCE(viewing_status, 0) = 0
            ORDER BY viewing_date ASC, id_viewing ASC
            `,
            [],
        );

        for (const viewing of dueViewings) {
            await this.moveLeadFromCitaToVisita(viewing.id_viewing, viewing.id_lead);
        }
    }

    private normalizePhaseName(value: string) {
        return value
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim()
            .toLowerCase();
    }

    private matchesPhaseName(
        phaseName: string,
        candidates: readonly string[],
    ) {
        const normalizedName = this.normalizePhaseName(phaseName);
        return candidates.some((candidate) => {
            const normalizedCandidate = this.normalizePhaseName(candidate);
            return (
                normalizedName === normalizedCandidate ||
                normalizedName.startsWith(`${normalizedCandidate} `) ||
                normalizedName.includes(` ${normalizedCandidate}`)
            );
        });
    }

    private async resolveLeadPhaseNameColumn() {
        if (this.leadPhaseNameColumn !== null) {
            return this.leadPhaseNameColumn;
        }

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT COLUMN_NAME
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'lead_phases'
              AND COLUMN_NAME IN (
                'lead_phase_name',
                'phase_name',
                'name',
                'lead_phase'
              )
            ORDER BY CASE
                WHEN COLUMN_NAME = 'lead_phase_name' THEN 1
                WHEN COLUMN_NAME = 'phase_name' THEN 2
                WHEN COLUMN_NAME = 'name' THEN 3
                WHEN COLUMN_NAME = 'lead_phase' THEN 4
                ELSE 5
            END
            LIMIT 1
            `,
            [],
        );

        const columnName = rows[0]?.COLUMN_NAME;
        this.leadPhaseNameColumn = typeof columnName === 'string' ? columnName : '';
        return this.leadPhaseNameColumn;
    }

    private async resolveTransitionPhaseIds() {
        if (this.cachedCitaPhaseIds && this.cachedVisitaPhaseId !== null) {
            return {
                citaPhaseIds: this.cachedCitaPhaseIds,
                visitaPhaseId: this.cachedVisitaPhaseId,
            };
        }

        const leadPhaseNameColumn = await this.resolveLeadPhaseNameColumn();
        if (!leadPhaseNameColumn) {
            throw new NotFoundException(
                'No se encontró columna de nombre de fase en lead_phases',
            );
        }

        const rows = await this.mySqlService.queryRows<LeadPhaseRow>(
            `
            SELECT id_lead_phase, ${leadPhaseNameColumn} AS phase_label
            FROM lead_phases
            `,
            [],
        );

        const citaPhaseIds = rows
            .filter(
                (row) =>
                    typeof row.phase_label === 'string' &&
                    this.matchesPhaseName(
                        row.phase_label,
                        this.citaPhaseNameCandidates,
                    ),
            )
            .map((row) => row.id_lead_phase);

        const visitaPhase = rows.find(
            (row) =>
                typeof row.phase_label === 'string' &&
                this.matchesPhaseName(
                    row.phase_label,
                    this.visitaPhaseNameCandidates,
                ),
        );

        if (citaPhaseIds.length === 0 || !visitaPhase) {
            throw new NotFoundException(
                'No se pudieron resolver las fases CITA/VISITA en lead_phases',
            );
        }

        this.cachedCitaPhaseIds = citaPhaseIds;
        this.cachedVisitaPhaseId = visitaPhase.id_lead_phase;

        return {
            citaPhaseIds,
            visitaPhaseId: visitaPhase.id_lead_phase,
        };
    }

    private async moveLeadFromCitaToVisita(idViewing: number, idLead: number) {
        const { citaPhaseIds, visitaPhaseId } =
            await this.resolveTransitionPhaseIds();
        const inClause = citaPhaseIds.map(() => '?').join(', ');

        await this.mySqlService.execute(
            `
            UPDATE lead_phase_history
            SET lead_phase_exit_date = NOW()
            WHERE id_lead_phase_history = (
                SELECT id_lead_phase_history
                FROM (
                    SELECT id_lead_phase_history
                    FROM lead_phase_history
                    WHERE id_lead = ?
                      AND lead_phase_exit_date IS NULL
                      AND id_lead_phase IN (${inClause})
                    ORDER BY lead_phase_entry_date DESC, id_lead_phase_history DESC
                    LIMIT 1
                ) AS sub
            )
            `,
            [idLead, ...citaPhaseIds],
        );

        await this.mySqlService.execute(
            `
            UPDATE leads
            SET id_lead_phase = ?
            WHERE id_lead = ?
            `,
            [visitaPhaseId, idLead],
        );

        const openVisitaRows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_lead_phase_history
            FROM lead_phase_history
            WHERE id_lead = ?
              AND id_lead_phase = ?
              AND lead_phase_exit_date IS NULL
            ORDER BY id_lead_phase_history DESC
            LIMIT 1
            `,
            [idLead, visitaPhaseId],
        );

        if (!openVisitaRows[0]) {
            await this.mySqlService.execute(
                `
                INSERT INTO lead_phase_history (
                    id_lead,
                    id_lead_phase,
                    lead_phase_entry_date,
                    lead_phase_exit_date
                )
                VALUES (?, ?, NOW(), NULL)
                `,
                [idLead, visitaPhaseId],
            );
        }

        await this.mySqlService.execute(
            `
            UPDATE viewings
            SET viewing_status = 1
            WHERE id_viewing = ?
            `,
            [idViewing],
        );
    }

    private normalizeStatus(value: unknown) {
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }

        if (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            (value === 0 || value === 1)
        ) {
            return value;
        }

        throw new BadRequestException('viewing_status must be boolean or 0/1');
    }

    private ensureValidDateString(value: unknown) {
        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException('viewing_date is required');
        }

        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
            throw new BadRequestException(
                'viewing_date must be a valid datetime string',
            );
        }

        return value.trim();
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

    private async getViewingByIdOrFail(idViewing: number) {
        const rows = await this.mySqlService.queryRows<ViewingRow>(
            `
            SELECT id_viewing, viewing_date, viewing_status, id_lead
            FROM viewings
            WHERE id_viewing = ?
            LIMIT 1
            `,
            [idViewing],
        );

        const viewing = rows[0];
        if (!viewing) {
            throw new NotFoundException(
                `Viewing with id_viewing ${idViewing} was not found`,
            );
        }

        return viewing;
    }

    private async getLatestViewingByLeadIdOrFail(idLead: number) {
        const rows = await this.mySqlService.queryRows<ViewingRow>(
            `
            SELECT id_viewing, viewing_date, viewing_status, id_lead
            FROM viewings
            WHERE id_lead = ?
            ORDER BY viewing_date DESC, id_viewing DESC
            LIMIT 1
            `,
            [idLead],
        );

        const viewing = rows[0];
        if (!viewing) {
            throw new NotFoundException(
                `No viewing found for id_lead ${idLead}`,
            );
        }

        return viewing;
    }

    async getAllViewings() {
        const rows = await this.mySqlService.queryRows<ViewingRow>(
            `
            SELECT id_viewing, viewing_date, viewing_status, id_lead
            FROM viewings
            ORDER BY id_viewing DESC
            `,
            [],
        );

        return rows;
    }

    async getViewingsByLeadId(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureLeadExists(idLead);

        const rows = await this.mySqlService.queryRows<ViewingRow>(
            `
            SELECT id_viewing, viewing_date, viewing_status, id_lead
            FROM viewings
            WHERE id_lead = ?
            ORDER BY id_viewing DESC
            `,
            [idLead],
        );

        return rows;
    }

    async createViewing(payload: CreateViewingDto) {
        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        const viewingDate = this.ensureValidDateString(payload.viewing_date);

        const idLead = payload.id_lead;
        if (
            typeof idLead !== 'number' ||
            !Number.isInteger(idLead) ||
            idLead <= 0
        ) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureLeadExists(idLead);

        const insertResult = await this.mySqlService.execute(
            `
            INSERT INTO viewings (viewing_date, id_lead)
            VALUES (?, ?)
            `,
            [viewingDate, idLead],
        );

        return this.getViewingByIdOrFail(insertResult.insertId);
    }

    async updateViewingByLeadId(idLead: number, payload: UpdateViewingDto) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        await this.ensureLeadExists(idLead);
        const targetViewing = await this.getLatestViewingByLeadIdOrFail(idLead);

        const body = payload as Record<string, unknown>;
        const allowedKeys = new Set(['viewing_date', 'viewing_status', 'id_lead']);

        for (const key of Object.keys(body)) {
            if (!allowedKeys.has(key)) {
                throw new BadRequestException(
                    'Only viewing_date, viewing_status and id_lead are allowed',
                );
            }
        }

        const updates: string[] = [];
        const params: Array<string | number> = [];

        if (Object.prototype.hasOwnProperty.call(body, 'viewing_date')) {
            const viewingDate = this.ensureValidDateString(body.viewing_date);
            updates.push('viewing_date = ?');
            params.push(viewingDate);
        }

        if (Object.prototype.hasOwnProperty.call(body, 'viewing_status')) {
            const viewingStatus = this.normalizeStatus(body.viewing_status);
            updates.push('viewing_status = ?');
            params.push(viewingStatus);
        }

        if (Object.prototype.hasOwnProperty.call(body, 'id_lead')) {
            const idLead = body.id_lead;
            if (
                typeof idLead !== 'number' ||
                !Number.isInteger(idLead) ||
                idLead <= 0
            ) {
                throw new BadRequestException('id_lead must be a positive integer');
            }

            await this.ensureLeadExists(idLead);
            updates.push('id_lead = ?');
            params.push(idLead);
        }

        if (updates.length === 0) {
            throw new BadRequestException(
                'At least one field is required: viewing_date, viewing_status, id_lead',
            );
        }

        params.push(targetViewing.id_viewing);

        await this.mySqlService.execute(
            `
            UPDATE viewings
            SET ${updates.join(', ')}
            WHERE id_viewing = ?
            `,
            params,
        );

        return this.getViewingByIdOrFail(targetViewing.id_viewing);
    }

    async deleteViewingByLeadId(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        await this.ensureLeadExists(idLead);
        const targetViewing = await this.getLatestViewingByLeadIdOrFail(idLead);

        await this.mySqlService.execute(
            `
            DELETE FROM viewings
            WHERE id_viewing = ?
            `,
            [targetViewing.id_viewing],
        );

        return {
            message: `Latest viewing for lead ${idLead} deleted successfully`,
        };
    }
}
