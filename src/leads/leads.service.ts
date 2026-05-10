import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateContactCenterLeadDto, CreateLeadDto, UpdateLeadDto } from './dto';

type LeadRow = RowDataPacket & {
    id_lead: number;
    lead_client_name: string;
    lead_client_phone: string;
    lead_client_email?: string | null;
    total_amount?: number | null;
    number_of_payments?: number | null;
    id_lead_phase: number;
    id_manager?: number | null;
    id_supervisor?: number | null;
    id_sales_person?: number | null;
    id_contact_center?: number | null;
    id_project?: number | null;
    id_house?: number | null;
    id_bank?: number | null;
};

type LeadOwnerType = 'sales' | 'contact-center';

type CreateLeadPayload = CreateLeadDto | CreateContactCenterLeadDto;

@Injectable()
export class LeadsService {
    constructor(private readonly mySqlService: MySqlService) {}

    private normalizeOptionalAmount(
        value: unknown,
        fieldName: string,
    ): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            const normalized = value.trim();
            if (!normalized) {
                return null;
            }

            const parsed = Number(normalized);
            if (!Number.isFinite(parsed) || parsed < 0) {
                throw new BadRequestException(
                    `${fieldName} must be null, empty, or a non-negative number`,
                );
            }

            return parsed;
        }

        if (typeof value === 'number') {
            if (!Number.isFinite(value) || value < 0) {
                throw new BadRequestException(
                    `${fieldName} must be null, empty, or a non-negative number`,
                );
            }

            return value;
        }

        throw new BadRequestException(
            `${fieldName} must be null, empty, or a non-negative number`,
        );
    }

    private normalizeOptionalRelationId(
        value: unknown,
        fieldName: string,
    ): number | null {
        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === 'string') {
            const normalized = value.trim();
            if (!normalized || normalized === '0') {
                return null;
            }

            const parsed = Number(normalized);
            if (!Number.isInteger(parsed) || parsed <= 0) {
                throw new BadRequestException(
                    `${fieldName} must be null, empty, 0, or a positive integer`,
                );
            }

            return parsed;
        }

        if (typeof value === 'number') {
            if (value === 0) {
                return null;
            }

            if (!Number.isInteger(value) || value <= 0) {
                throw new BadRequestException(
                    `${fieldName} must be null, empty, 0, or a positive integer`,
                );
            }

            return value;
        }

        throw new BadRequestException(
            `${fieldName} must be null, empty, 0, or a positive integer`,
        );
    }

    async getLeads() {
        return this.mySqlService.queryRows<LeadRow>(
            `
            SELECT *
            FROM leads
            ORDER BY id_lead DESC
            `,
            [],
        );
    }

    async getLeadsByIdLead(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.mySqlService.queryRows<LeadRow>(
            `
            SELECT *
            FROM leads
            WHERE id_lead = ?
            ORDER BY id_lead DESC
            `,
            [idLead],
        );
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

    private async closeLatestOpenLeadPhaseHistory(idLead: number) {
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
                    ORDER BY lead_phase_entry_date DESC, id_lead_phase_history DESC
                    LIMIT 1
                ) AS sub
            )
            `,
            [idLead],
        );
    }

    private async ensureOpenLeadPhaseHistory(idLead: number, idLeadPhase: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_lead_phase_history
            FROM lead_phase_history
            WHERE id_lead = ?
              AND id_lead_phase = ?
              AND lead_phase_exit_date IS NULL
            ORDER BY id_lead_phase_history DESC
            LIMIT 1
            `,
            [idLead, idLeadPhase],
        );

        if (!rows[0]) {
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
                [idLead, idLeadPhase],
            );
        }
    }

    private async syncLeadPhaseHistory(idLead: number, idLeadPhase: number) {
        await this.closeLatestOpenLeadPhaseHistory(idLead);
        await this.ensureOpenLeadPhaseHistory(idLead, idLeadPhase);
    }

    private async ensureProjectExists(idProject: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_project
            FROM projects
            WHERE id_project = ?
            LIMIT 1
            `,
            [idProject],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Project with id_project ${idProject} not found`,
            );
        }
    }

    private async ensureHouseExists(idHouse: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_house
            FROM houses
            WHERE id_house = ?
            LIMIT 1
            `,
            [idHouse],
        );

        if (!rows[0]) {
            throw new NotFoundException(`House with id_house ${idHouse} not found`);
        }
    }

    private async ensureBankExists(idBank: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_bank
            FROM banks
            WHERE id_bank = ?
            LIMIT 1
            `,
            [idBank],
        );

        if (!rows[0]) {
            throw new NotFoundException(`Bank with id_bank ${idBank} not found`);
        }
    }

    private async getLeadByIdOrFail(idLead: number) {
        const rows = await this.mySqlService.queryRows<LeadRow>(
            `
            SELECT *
            FROM leads
            WHERE id_lead = ?
            LIMIT 1
            `,
            [idLead],
        );

        const lead = rows[0];
        if (!lead) {
            throw new NotFoundException(`Lead with id_lead ${idLead} not found`);
        }

        return lead;
    }

    async getLeadById(idLead: number) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        return this.getLeadByIdOrFail(idLead);
    }

    private async createLeadByOwnerType(
        payload: CreateLeadPayload,
        ownerType: LeadOwnerType,
    ) {
        if (!Number.isInteger(payload.id_lead_phase) || payload.id_lead_phase <= 0) {
            throw new BadRequestException('id_lead_phase must be a positive integer');
        }

        await this.ensureLeadPhaseExists(payload.id_lead_phase);

        const leadClientEmail = payload.lead_client_email?.trim() || null;
        const totalAmount = this.normalizeOptionalAmount(
            payload.total_amount,
            'total_amount',
        );
        const idManager = this.normalizeOptionalRelationId(
            payload.id_manager,
            'id_manager',
        );
        const idSupervisor = this.normalizeOptionalRelationId(
            payload.id_supervisor,
            'id_supervisor',
        );
        const idSalesPerson =
            ownerType === 'sales'
                ? this.normalizeOptionalRelationId(
                      (payload as CreateLeadDto).id_sales_person,
                      'id_sales_person',
                  )
                : null;
        const idContactCenter =
            ownerType === 'contact-center'
                ? this.normalizeOptionalRelationId(
                      (payload as CreateContactCenterLeadDto).id_contact_center,
                      'id_contact_center',
                  )
                : null;
        const idProject = this.normalizeOptionalRelationId(
            payload.id_project,
            'id_project',
        );
        const idHouse = this.normalizeOptionalRelationId(
            payload.id_house,
            'id_house',
        );
        const idBank = this.normalizeOptionalRelationId(payload.id_bank, 'id_bank');
        const numberOfPayments =
            payload.number_of_payments !== undefined &&
            payload.number_of_payments !== null
                ? this.normalizeOptionalRelationId(
                      payload.number_of_payments,
                      'number_of_payments',
                  )
                : null;

        if (idProject !== null) {
            await this.ensureProjectExists(idProject);
        }

        if (idHouse !== null) {
            await this.ensureHouseExists(idHouse);
        }

        if (idBank !== null) {
            await this.ensureBankExists(idBank);
        }

        const result = await this.mySqlService.execute(
            `
            INSERT INTO leads (
                lead_client_name,
                lead_client_phone,
                lead_client_email,
                total_amount,
                number_of_payments,
                id_lead_phase,
                id_manager,
                id_supervisor,
                id_sales_person,
                id_contact_center,
                id_project,
                id_house,
                id_bank
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                payload.lead_client_name.trim(),
                payload.lead_client_phone.trim(),
                leadClientEmail,
                totalAmount,
                numberOfPayments,
                payload.id_lead_phase,
                idManager,
                idSupervisor,
                idSalesPerson,
                idContactCenter,
                idProject,
                idHouse,
                idBank,
            ],
        );

        await this.ensureOpenLeadPhaseHistory(result.insertId, payload.id_lead_phase);

        return this.getLeadByIdOrFail(result.insertId);
    }

    async createLead(payload: CreateLeadDto) {
        return this.createLeadByOwnerType(payload, 'sales');
    }

    async createContactCenterLead(payload: CreateContactCenterLeadDto) {
        return this.createLeadByOwnerType(payload, 'contact-center');
    }

    async updateLead(idLead: number, payload: UpdateLeadDto) {
        if (!Number.isInteger(idLead) || idLead <= 0) {
            throw new BadRequestException('id_lead must be a positive integer');
        }

        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException('Request body must be a valid JSON object');
        }

        const currentLead = await this.getLeadByIdOrFail(idLead);

        const body = payload as Record<string, unknown>;
        const updates: string[] = [];
        const params: Array<string | number | null> = [];
        let nextLeadPhaseId: number | null = null;
        const hasDefinedProperty = (key: string) =>
            Object.prototype.hasOwnProperty.call(body, key) &&
            body[key] !== undefined;

        if (hasDefinedProperty('lead_client_name')) {
            const leadClientName = body.lead_client_name;
            if (typeof leadClientName !== 'string' || !leadClientName.trim()) {
                throw new BadRequestException(
                    'lead_client_name must be a non-empty string',
                );
            }

            updates.push('lead_client_name = ?');
            params.push(leadClientName.trim());
        }

        if (hasDefinedProperty('lead_client_phone')) {
            const leadClientPhone = body.lead_client_phone;
            if (typeof leadClientPhone !== 'string' || !leadClientPhone.trim()) {
                throw new BadRequestException(
                    'lead_client_phone must be a non-empty string',
                );
            }

            updates.push('lead_client_phone = ?');
            params.push(leadClientPhone.trim());
        }

        if (hasDefinedProperty('lead_client_email')) {
            const leadClientEmail = body.lead_client_email;
            if (leadClientEmail === null) {
                updates.push('lead_client_email = ?');
                params.push(null);
            } else {
                if (
                    typeof leadClientEmail !== 'string' ||
                    !leadClientEmail.trim()
                ) {
                    throw new BadRequestException(
                        'lead_client_email must be null or a non-empty string',
                    );
                }

                updates.push('lead_client_email = ?');
                params.push(leadClientEmail.trim());
            }
        }

        if (hasDefinedProperty('total_amount')) {
            const totalAmount = body.total_amount;
            if (totalAmount === null) {
                updates.push('total_amount = ?');
                params.push(null);
            } else {
                const normalizedTotalAmount = this.normalizeOptionalAmount(
                    totalAmount,
                    'total_amount',
                );
                updates.push('total_amount = ?');
                params.push(normalizedTotalAmount);
            }
        }

        if (hasDefinedProperty('number_of_payments')) {
            const numberOfPayments = body.number_of_payments;
            if (numberOfPayments === null) {
                updates.push('number_of_payments = ?');
                params.push(null);
            } else {
                const normalizedNumberOfPayments = this.normalizeOptionalRelationId(
                    numberOfPayments,
                    'number_of_payments',
                );
                updates.push('number_of_payments = ?');
                params.push(normalizedNumberOfPayments);
            }
        }

        if (hasDefinedProperty('id_lead_phase')) {
            const idLeadPhase = body.id_lead_phase;
            if (
                typeof idLeadPhase !== 'number' ||
                !Number.isInteger(idLeadPhase) ||
                idLeadPhase <= 0
            ) {
                throw new BadRequestException(
                    'id_lead_phase must be a positive integer',
                );
            }

            await this.ensureLeadPhaseExists(idLeadPhase);
            updates.push('id_lead_phase = ?');
            params.push(idLeadPhase);
            nextLeadPhaseId = idLeadPhase;
        }

        if (hasDefinedProperty('id_manager')) {
            const idManager = this.normalizeOptionalRelationId(
                body.id_manager,
                'id_manager',
            );
            updates.push('id_manager = ?');
            params.push(idManager);
        }

        if (hasDefinedProperty('id_supervisor')) {
            const idSupervisor = this.normalizeOptionalRelationId(
                body.id_supervisor,
                'id_supervisor',
            );
            updates.push('id_supervisor = ?');
            params.push(idSupervisor);
        }

        if (hasDefinedProperty('id_sales_person')) {
            const idSalesPerson = this.normalizeOptionalRelationId(
                body.id_sales_person,
                'id_sales_person',
            );
            updates.push('id_sales_person = ?');
            params.push(idSalesPerson);
        }

        if (hasDefinedProperty('id_project')) {
            const idProject = this.normalizeOptionalRelationId(
                body.id_project,
                'id_project',
            );

            if (idProject !== null) {
                await this.ensureProjectExists(idProject);
            }

            updates.push('id_project = ?');
            params.push(idProject);
        }

        if (hasDefinedProperty('id_house')) {
            const idHouse = this.normalizeOptionalRelationId(
                body.id_house,
                'id_house',
            );

            if (idHouse !== null) {
                await this.ensureHouseExists(idHouse);
            }

            updates.push('id_house = ?');
            params.push(idHouse);
        }

        if (hasDefinedProperty('id_bank')) {
            const idBank = this.normalizeOptionalRelationId(body.id_bank, 'id_bank');

            if (idBank !== null) {
                await this.ensureBankExists(idBank);
            }

            updates.push('id_bank = ?');
            params.push(idBank);
        }

        if (updates.length === 0) {
            throw new BadRequestException(
                'At least one valid field must be provided to update',
            );
        }

        params.push(idLead);

        await this.mySqlService.execute(
            `
            UPDATE leads
            SET ${updates.join(', ')}
            WHERE id_lead = ?
            `,
            params,
        );

        if (
            nextLeadPhaseId !== null &&
            nextLeadPhaseId !== currentLead.id_lead_phase
        ) {
            await this.syncLeadPhaseHistory(idLead, nextLeadPhaseId);
        }

        return this.getLeadByIdOrFail(idLead);
    }
}
