import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import {
    buildPaginationMeta,
    resolvePagination,
} from '../common/utils/pagination.util';
import {
    MySqlService,
    type MySqlTransactionConnection,
} from '../database/mysql.service';
import { CreateMonthlyCloseDto } from './dto/create-monthly-close.dto';
import { CreateReceivablePaymentDto } from './dto/create-receivable-payment.dto';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListReceivablesQueryDto } from './dto/list-receivables-query.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { MonthQueryDto } from './dto/month-query.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

type CountRow = RowDataPacket & {
    total: number;
};

type StatusRow = RowDataPacket & {
    id_receivable_status: number;
    is_final: number;
};

type ReceivableRow = RowDataPacket & {
    id_receivable: number;
    invoice_number: string;
    id_lead: number | null;
    client_name: string;
    issue_date: string;
    due_date: string;
    amount: number;
    balance: number;
    id_receivable_status: number;
    currency_code: string;
    notes: string | null;
    id_created_by: number;
    id_updated_by: number | null;
    created_at: string;
    updated_at: string;
};

type CatalogRow = RowDataPacket & {
    id: number;
};

@Injectable()
export class AccountingService {
    constructor(private readonly mySqlService: MySqlService) {}

    private assertPositiveInt(value: number, fieldName: string) {
        if (!Number.isInteger(value) || value <= 0) {
            throw new BadRequestException({
                code: 'VALIDATION_POSITIVE_INTEGER_REQUIRED',
                message: `${fieldName} must be a positive integer`,
                details: { field: fieldName, value },
            });
        }
    }

    private normalizeCurrencyCode(rawCode?: string | null) {
        if (!rawCode) {
            return 'GTQ';
        }

        const normalized = rawCode.trim().toUpperCase();
        if (normalized.length !== 3) {
            throw new BadRequestException({
                code: 'CURRENCY_CODE_INVALID',
                message: 'currency_code must have 3 characters',
                details: { currency_code: rawCode },
            });
        }

        return normalized;
    }

    private getMonthDateRange(month: string) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
            throw new BadRequestException({
                code: 'MONTH_FORMAT_INVALID',
                message: 'month must use YYYY-MM format',
                details: { month },
            });
        }

        const [yearRaw, monthRaw] = month.split('-');
        const year = Number(yearRaw);
        const monthIndex = Number(monthRaw) - 1;

        const start = new Date(Date.UTC(year, monthIndex, 1));
        const end = new Date(Date.UTC(year, monthIndex + 1, 0));

        const toDateText = (date: Date) => date.toISOString().slice(0, 10);

        return {
            startDate: toDateText(start),
            endDate: toDateText(end),
        };
    }

    private async ensureEmployeeExists(idEmployee: number) {
        this.assertPositiveInt(idEmployee, 'id_employee');

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

    private async ensureEmployeeExistsInTx(
        connection: MySqlTransactionConnection,
        idEmployee: number,
    ) {
        this.assertPositiveInt(idEmployee, 'id_employee');

        const rows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
            connection,
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

    private async ensureLeadExists(idLead: number) {
        this.assertPositiveInt(idLead, 'id_lead');

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

    private async ensureLeadExistsInTx(
        connection: MySqlTransactionConnection,
        idLead: number,
    ) {
        this.assertPositiveInt(idLead, 'id_lead');

        const rows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
            connection,
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

    private async ensureCatalogExists(
        tableName: string,
        idColumn: string,
        value: number,
    ) {
        this.assertPositiveInt(value, idColumn);

        const rows = await this.mySqlService.queryRows<CatalogRow>(
            `
            SELECT ${idColumn} AS id
            FROM ${tableName}
            WHERE ${idColumn} = ?
            LIMIT 1
            `,
            [value],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'CATALOG_VALUE_NOT_FOUND',
                message: `${tableName}.${idColumn} value ${value} was not found`,
                details: {
                    table: tableName,
                    column: idColumn,
                    value,
                },
            });
        }
    }

    private async ensureCatalogExistsInTx(
        connection: MySqlTransactionConnection,
        tableName: string,
        idColumn: string,
        value: number,
    ) {
        this.assertPositiveInt(value, idColumn);

        const rows = await this.mySqlService.queryRowsInTx<CatalogRow>(
            connection,
            `
            SELECT ${idColumn} AS id
            FROM ${tableName}
            WHERE ${idColumn} = ?
            LIMIT 1
            `,
            [value],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'CATALOG_VALUE_NOT_FOUND',
                message: `${tableName}.${idColumn} value ${value} was not found`,
                details: {
                    table: tableName,
                    column: idColumn,
                    value,
                },
            });
        }
    }

    private async getTransactionByIdOrFail(idTransaction: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT *
            FROM accounting_transactions
            WHERE id_transaction = ?
              AND deleted_at IS NULL
            LIMIT 1
            `,
            [idTransaction],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'ACCOUNTING_TRANSACTION_NOT_FOUND',
                message: `Transaction ${idTransaction} not found`,
                details: { id_transaction: idTransaction },
            });
        }

        return rows[0];
    }

    private async getReceivableByIdOrFail(idReceivable: number) {
        const rows = await this.mySqlService.queryRows<ReceivableRow>(
            `
            SELECT *
            FROM accounting_receivables
            WHERE id_receivable = ?
            LIMIT 1
            `,
            [idReceivable],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'ACCOUNTING_RECEIVABLE_NOT_FOUND',
                message: `Receivable ${idReceivable} not found`,
                details: { id_receivable: idReceivable },
            });
        }

        return rows[0];
    }

    private async getReceivableByIdOrFailInTx(
        connection: MySqlTransactionConnection,
        idReceivable: number,
    ) {
        const rows = await this.mySqlService.queryRowsInTx<ReceivableRow>(
            connection,
            `
            SELECT *
            FROM accounting_receivables
            WHERE id_receivable = ?
            LIMIT 1
            FOR UPDATE
            `,
            [idReceivable],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'ACCOUNTING_RECEIVABLE_NOT_FOUND',
                message: `Receivable ${idReceivable} not found`,
                details: { id_receivable: idReceivable },
            });
        }

        return rows[0];
    }

    private async resolveReceivableStatusByBalance(
        connection: MySqlTransactionConnection,
        balance: number,
        totalAmount: number,
    ) {
        const rows = await this.mySqlService.queryRowsInTx<StatusRow>(
            connection,
            `
            SELECT id_receivable_status, is_final
            FROM accounting_receivable_statuses
            WHERE is_active = 1
            ORDER BY is_final ASC, id_receivable_status ASC
            `,
            [],
        );

        if (rows.length === 0) {
            throw new NotFoundException({
                code: 'CATALOG_EMPTY',
                message: 'accounting_receivable_statuses has no active rows',
                details: { table: 'accounting_receivable_statuses' },
            });
        }

        const finalStatus = rows.find((row) => Number(row.is_final) === 1);
        const nonFinalStatuses = rows.filter((row) => Number(row.is_final) !== 1);

        if (balance <= 0) {
            return finalStatus?.id_receivable_status ?? rows[rows.length - 1].id_receivable_status;
        }

        if (nonFinalStatuses.length === 0) {
            return rows[0].id_receivable_status;
        }

        if (balance >= totalAmount) {
            return nonFinalStatuses[0].id_receivable_status;
        }

        return (
            nonFinalStatuses[1]?.id_receivable_status ??
            nonFinalStatuses[0].id_receivable_status
        );
    }

    private async resolveCollectionTransactionTypeInTx(
        connection: MySqlTransactionConnection,
    ) {
        const rows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
            connection,
            `
            SELECT id_transaction_type
            FROM accounting_transaction_types
            WHERE is_active = 1
            ORDER BY CASE WHEN sign_multiplier > 0 THEN 0 ELSE 1 END,
                     id_transaction_type ASC
            LIMIT 1
            `,
            [],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'CATALOG_EMPTY',
                message: 'accounting_transaction_types has no active rows',
                details: { table: 'accounting_transaction_types' },
            });
        }

        return Number(rows[0].id_transaction_type);
    }

    private async resolveDefaultTransactionStatusInTx(
        connection: MySqlTransactionConnection,
    ) {
        const rows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
            connection,
            `
            SELECT id_transaction_status
            FROM accounting_transaction_statuses
            WHERE is_active = 1
            ORDER BY is_final ASC, id_transaction_status ASC
            LIMIT 1
            `,
            [],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'CATALOG_EMPTY',
                message: 'accounting_transaction_statuses has no active rows',
                details: { table: 'accounting_transaction_statuses' },
            });
        }

        return Number(rows[0].id_transaction_status);
    }

    private async resolveCollectionCategoryInTx(
        connection: MySqlTransactionConnection,
        idTransactionType: number,
    ) {
        const rows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
            connection,
            `
            SELECT id_accounting_category
            FROM accounting_categories
            WHERE is_active = 1
              AND (id_transaction_type = ? OR id_transaction_type IS NULL)
            ORDER BY CASE WHEN id_transaction_type = ? THEN 0 ELSE 1 END,
                     id_accounting_category ASC
            LIMIT 1
            `,
            [idTransactionType, idTransactionType],
        );

        if (!rows[0]) {
            throw new NotFoundException({
                code: 'CATALOG_EMPTY',
                message: 'accounting_categories has no active rows',
                details: { table: 'accounting_categories' },
            });
        }

        return Number(rows[0].id_accounting_category);
    }

    async getSummary(query: MonthQueryDto) {
        if (!query.month) {
            throw new BadRequestException({
                code: 'MONTH_REQUIRED',
                message: 'month query param is required',
                details: {},
            });
        }

        const { startDate, endDate } = this.getMonthDateRange(query.month);

        const totalsRows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT
                COALESCE(SUM(CASE WHEN tt.sign_multiplier > 0 THEN at.amount ELSE 0 END), 0) AS income_total,
                COALESCE(SUM(CASE WHEN tt.sign_multiplier < 0 THEN at.amount ELSE 0 END), 0) AS expense_total,
                COALESCE(SUM(CASE WHEN tt.sign_multiplier > 0 THEN at.amount ELSE -at.amount END), 0) AS net_total
            FROM accounting_transactions at
            INNER JOIN accounting_transaction_types tt
                ON tt.id_transaction_type = at.id_transaction_type
            WHERE at.deleted_at IS NULL
              AND at.transaction_date BETWEEN ? AND ?
            `,
            [startDate, endDate],
        );

        const pendingRows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT COALESCE(SUM(balance), 0) AS pending_total
            FROM accounting_receivables
            WHERE due_date BETWEEN ? AND ?
              AND balance > 0
            `,
            [startDate, endDate],
        );

        const closeRows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT mc.*, mcs.status_code, mcs.status_name
            FROM accounting_monthly_closes mc
            INNER JOIN accounting_monthly_close_statuses mcs
                ON mcs.id_monthly_close_status = mc.id_monthly_close_status
            WHERE mc.month_key = ?
            LIMIT 1
            `,
            [query.month],
        );

        return {
            month: query.month,
            income_total: Number(totalsRows[0]?.income_total ?? 0),
            expense_total: Number(totalsRows[0]?.expense_total ?? 0),
            net_total: Number(totalsRows[0]?.net_total ?? 0),
            pending_total: Number(pendingRows[0]?.pending_total ?? 0),
            monthly_close: closeRows[0] ?? null,
        };
    }

    async getTransactions(query: ListTransactionsQueryDto) {
        const pagination = resolvePagination({
            page: query.page,
            page_size: query.page_size,
        });

        const whereParts: string[] = ['at.deleted_at IS NULL'];
        const params: Array<string | number> = [];

        if (query.from) {
            whereParts.push('at.transaction_date >= ?');
            params.push(query.from);
        }

        if (query.to) {
            whereParts.push('at.transaction_date <= ?');
            params.push(query.to);
        }

        if (query.id_transaction_type) {
            whereParts.push('at.id_transaction_type = ?');
            params.push(query.id_transaction_type);
        }

        if (query.id_transaction_status) {
            whereParts.push('at.id_transaction_status = ?');
            params.push(query.id_transaction_status);
        }

        if (query.id_accounting_category) {
            whereParts.push('at.id_accounting_category = ?');
            params.push(query.id_accounting_category);
        }

        if (query.id_lead) {
            whereParts.push('at.id_lead = ?');
            params.push(query.id_lead);
        }

        const normalizedSearch = query.search?.trim();
        if (normalizedSearch) {
            whereParts.push(
                '(at.concept LIKE ? OR at.counterparty LIKE ? OR at.external_reference LIKE ? OR at.notes LIKE ?)',
            );
            params.push(
                `%${normalizedSearch}%`,
                `%${normalizedSearch}%`,
                `%${normalizedSearch}%`,
                `%${normalizedSearch}%`,
            );
        }

        const whereClause = `WHERE ${whereParts.join(' AND ')}`;

        const countRows = await this.mySqlService.queryRows<CountRow>(
            `
            SELECT COUNT(*) AS total
            FROM accounting_transactions at
            ${whereClause}
            `,
            params,
        );

        const totalItems = Number(countRows[0]?.total ?? 0);

        const items = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT
                at.*,
                tt.type_code,
                tt.type_name,
                ts.status_code,
                ts.status_name,
                ac.category_code,
                ac.category_name
            FROM accounting_transactions at
            INNER JOIN accounting_transaction_types tt
                ON tt.id_transaction_type = at.id_transaction_type
            INNER JOIN accounting_transaction_statuses ts
                ON ts.id_transaction_status = at.id_transaction_status
            LEFT JOIN accounting_categories ac
                ON ac.id_accounting_category = at.id_accounting_category
            ${whereClause}
            ORDER BY at.transaction_date DESC, at.id_transaction DESC
            LIMIT ? OFFSET ?
            `,
            [...params, pagination.page_size, pagination.offset],
        );

        return {
            items,
            pagination: buildPaginationMeta(
                pagination.page,
                pagination.page_size,
                totalItems,
            ),
        };
    }

    async createTransaction(payload: CreateTransactionDto) {
        await this.ensureCatalogExists(
            'accounting_transaction_types',
            'id_transaction_type',
            payload.id_transaction_type,
        );
        await this.ensureCatalogExists(
            'accounting_transaction_statuses',
            'id_transaction_status',
            payload.id_transaction_status,
        );

        if (payload.id_accounting_category !== undefined) {
            await this.ensureCatalogExists(
                'accounting_categories',
                'id_accounting_category',
                payload.id_accounting_category,
            );
        }

        if (payload.id_lead !== undefined) {
            await this.ensureLeadExists(payload.id_lead);
        }

        await this.ensureEmployeeExists(payload.id_created_by);

        const result = await this.mySqlService.execute(
            `
            INSERT INTO accounting_transactions (
                transaction_date,
                id_transaction_type,
                id_transaction_status,
                id_accounting_category,
                concept,
                counterparty,
                amount,
                currency_code,
                id_lead,
                external_reference,
                notes,
                id_created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                payload.transaction_date,
                payload.id_transaction_type,
                payload.id_transaction_status,
                payload.id_accounting_category ?? null,
                payload.concept.trim(),
                payload.counterparty?.trim() || null,
                payload.amount,
                this.normalizeCurrencyCode(payload.currency_code),
                payload.id_lead ?? null,
                payload.external_reference?.trim() || null,
                payload.notes?.trim() || null,
                payload.id_created_by,
            ],
        );

        return this.getTransactionByIdOrFail(result.insertId);
    }

    async updateTransaction(idTransaction: number, payload: UpdateTransactionDto) {
        this.assertPositiveInt(idTransaction, 'id_transaction');

        await this.getTransactionByIdOrFail(idTransaction);
        await this.ensureEmployeeExists(payload.id_updated_by);

        if (payload.id_transaction_type !== undefined && payload.id_transaction_type !== null) {
            await this.ensureCatalogExists(
                'accounting_transaction_types',
                'id_transaction_type',
                payload.id_transaction_type,
            );
        }

        if (
            payload.id_transaction_status !== undefined &&
            payload.id_transaction_status !== null
        ) {
            await this.ensureCatalogExists(
                'accounting_transaction_statuses',
                'id_transaction_status',
                payload.id_transaction_status,
            );
        }

        if (
            payload.id_accounting_category !== undefined &&
            payload.id_accounting_category !== null
        ) {
            await this.ensureCatalogExists(
                'accounting_categories',
                'id_accounting_category',
                payload.id_accounting_category,
            );
        }

        if (payload.id_lead !== undefined && payload.id_lead !== null) {
            await this.ensureLeadExists(payload.id_lead);
        }

        const updates: string[] = [];
        const values: Array<string | number | null> = [];

        const setIfDefined = (column: string, value: unknown) => {
            if (value === undefined) {
                return;
            }

            updates.push(`${column} = ?`);
            values.push(value as string | number | null);
        };

        setIfDefined('transaction_date', payload.transaction_date);
        setIfDefined('id_transaction_type', payload.id_transaction_type ?? null);
        setIfDefined('id_transaction_status', payload.id_transaction_status ?? null);
        setIfDefined('id_accounting_category', payload.id_accounting_category ?? null);
        setIfDefined('concept', payload.concept?.trim() ?? null);
        setIfDefined('counterparty', payload.counterparty?.trim() ?? null);
        setIfDefined('amount', payload.amount ?? null);
        setIfDefined(
            'currency_code',
            payload.currency_code === undefined
                ? undefined
                : this.normalizeCurrencyCode(payload.currency_code),
        );
        setIfDefined('id_lead', payload.id_lead ?? null);
        setIfDefined('external_reference', payload.external_reference?.trim() ?? null);
        setIfDefined('notes', payload.notes?.trim() ?? null);

        updates.push('id_updated_by = ?');
        values.push(payload.id_updated_by);

        if (updates.length === 1) {
            throw new BadRequestException({
                code: 'REQUEST_BODY_EMPTY',
                message: 'No updatable fields were provided',
                details: {},
            });
        }

        values.push(idTransaction);

        await this.mySqlService.execute(
            `
            UPDATE accounting_transactions
            SET ${updates.join(', ')}
            WHERE id_transaction = ?
            `,
            values,
        );

        return this.getTransactionByIdOrFail(idTransaction);
    }

    async getReceivables(query: ListReceivablesQueryDto) {
        const pagination = resolvePagination({
            page: query.page,
            page_size: query.page_size,
        });

        const whereParts: string[] = ['1 = 1'];
        const params: Array<string | number> = [];

        if (query.id_receivable_status) {
            whereParts.push('ar.id_receivable_status = ?');
            params.push(query.id_receivable_status);
        }

        if (query.due_from) {
            whereParts.push('ar.due_date >= ?');
            params.push(query.due_from);
        }

        if (query.due_to) {
            whereParts.push('ar.due_date <= ?');
            params.push(query.due_to);
        }

        const normalizedSearch = query.search?.trim();
        if (normalizedSearch) {
            whereParts.push(
                '(ar.invoice_number LIKE ? OR ar.client_name LIKE ? OR ar.notes LIKE ?)',
            );
            params.push(
                `%${normalizedSearch}%`,
                `%${normalizedSearch}%`,
                `%${normalizedSearch}%`,
            );
        }

        const whereClause = `WHERE ${whereParts.join(' AND ')}`;

        const countRows = await this.mySqlService.queryRows<CountRow>(
            `
            SELECT COUNT(*) AS total
            FROM accounting_receivables ar
            ${whereClause}
            `,
            params,
        );

        const totalItems = Number(countRows[0]?.total ?? 0);

        const items = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT
                ar.*,
                rs.status_code,
                rs.status_name
            FROM accounting_receivables ar
            INNER JOIN accounting_receivable_statuses rs
                ON rs.id_receivable_status = ar.id_receivable_status
            ${whereClause}
            ORDER BY ar.due_date ASC, ar.id_receivable DESC
            LIMIT ? OFFSET ?
            `,
            [...params, pagination.page_size, pagination.offset],
        );

        return {
            items,
            pagination: buildPaginationMeta(
                pagination.page,
                pagination.page_size,
                totalItems,
            ),
        };
    }

    async createReceivable(payload: CreateReceivableDto) {
        await this.ensureCatalogExists(
            'accounting_receivable_statuses',
            'id_receivable_status',
            payload.id_receivable_status,
        );

        if (payload.id_lead !== undefined) {
            await this.ensureLeadExists(payload.id_lead);
        }

        await this.ensureEmployeeExists(payload.id_created_by);

        const amount = Number(payload.amount);
        const balance =
            payload.balance === undefined || payload.balance === null
                ? amount
                : Number(payload.balance);

        if (balance < 0 || balance > amount) {
            throw new BadRequestException({
                code: 'RECEIVABLE_BALANCE_INVALID',
                message: 'balance must be between 0 and amount',
                details: {
                    balance,
                    amount,
                },
            });
        }

        const result = await this.mySqlService.execute(
            `
            INSERT INTO accounting_receivables (
                invoice_number,
                id_lead,
                client_name,
                issue_date,
                due_date,
                amount,
                balance,
                id_receivable_status,
                currency_code,
                notes,
                id_created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                payload.invoice_number.trim(),
                payload.id_lead ?? null,
                payload.client_name.trim(),
                payload.issue_date,
                payload.due_date,
                amount,
                balance,
                payload.id_receivable_status,
                this.normalizeCurrencyCode(payload.currency_code),
                payload.notes?.trim() || null,
                payload.id_created_by,
            ],
        );

        return this.getReceivableByIdOrFail(result.insertId);
    }

    async updateReceivable(idReceivable: number, payload: UpdateReceivableDto) {
        this.assertPositiveInt(idReceivable, 'id_receivable');

        const current = await this.getReceivableByIdOrFail(idReceivable);
        await this.ensureEmployeeExists(payload.id_updated_by);

        if (
            payload.id_receivable_status !== undefined &&
            payload.id_receivable_status !== null
        ) {
            await this.ensureCatalogExists(
                'accounting_receivable_statuses',
                'id_receivable_status',
                payload.id_receivable_status,
            );
        }

        if (payload.id_lead !== undefined && payload.id_lead !== null) {
            await this.ensureLeadExists(payload.id_lead);
        }

        const nextAmount =
            payload.amount === undefined || payload.amount === null
                ? Number(current.amount)
                : Number(payload.amount);
        const nextBalance =
            payload.balance === undefined || payload.balance === null
                ? Number(current.balance)
                : Number(payload.balance);

        if (nextBalance < 0 || nextBalance > nextAmount) {
            throw new BadRequestException({
                code: 'RECEIVABLE_BALANCE_INVALID',
                message: 'balance must be between 0 and amount',
                details: {
                    amount: nextAmount,
                    balance: nextBalance,
                },
            });
        }

        const updates: string[] = [];
        const values: Array<string | number | null> = [];

        const setIfDefined = (column: string, value: unknown) => {
            if (value === undefined) {
                return;
            }

            updates.push(`${column} = ?`);
            values.push(value as string | number | null);
        };

        setIfDefined('invoice_number', payload.invoice_number?.trim() ?? null);
        setIfDefined('id_lead', payload.id_lead ?? null);
        setIfDefined('client_name', payload.client_name?.trim() ?? null);
        setIfDefined('issue_date', payload.issue_date);
        setIfDefined('due_date', payload.due_date);
        setIfDefined('amount', payload.amount ?? null);
        setIfDefined('balance', payload.balance ?? null);
        setIfDefined('id_receivable_status', payload.id_receivable_status ?? null);
        setIfDefined(
            'currency_code',
            payload.currency_code === undefined
                ? undefined
                : this.normalizeCurrencyCode(payload.currency_code),
        );
        setIfDefined('notes', payload.notes?.trim() ?? null);

        updates.push('id_updated_by = ?');
        values.push(payload.id_updated_by);

        if (updates.length === 1) {
            throw new BadRequestException({
                code: 'REQUEST_BODY_EMPTY',
                message: 'No updatable fields were provided',
                details: {},
            });
        }

        values.push(idReceivable);

        await this.mySqlService.execute(
            `
            UPDATE accounting_receivables
            SET ${updates.join(', ')}
            WHERE id_receivable = ?
            `,
            values,
        );

        return this.getReceivableByIdOrFail(idReceivable);
    }

    async createReceivablePayment(
        idReceivable: number,
        payload: CreateReceivablePaymentDto,
    ) {
        this.assertPositiveInt(idReceivable, 'id_receivable');

        return this.mySqlService.withTransaction(async (connection) => {
            const receivable = await this.getReceivableByIdOrFailInTx(
                connection,
                idReceivable,
            );

            await this.ensureCatalogExistsInTx(
                connection,
                'accounting_payment_methods',
                'id_payment_method',
                payload.id_payment_method,
            );
            await this.ensureEmployeeExistsInTx(connection, payload.id_created_by);

            const currentBalance = Number(receivable.balance);
            const paymentAmount = Number(payload.amount);

            if (paymentAmount > currentBalance) {
                throw new BadRequestException({
                    code: 'RECEIVABLE_PAYMENT_EXCEEDS_BALANCE',
                    message: 'Payment amount cannot exceed current receivable balance',
                    details: {
                        id_receivable: idReceivable,
                        balance: currentBalance,
                        payment_amount: paymentAmount,
                    },
                });
            }

            const paymentInsert = await this.mySqlService.executeInTx(
                connection,
                `
                INSERT INTO accounting_receivable_payments (
                    id_receivable,
                    payment_date,
                    amount,
                    id_payment_method,
                    reference_number,
                    notes,
                    id_transaction,
                    id_created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
                `,
                [
                    idReceivable,
                    payload.payment_date,
                    paymentAmount,
                    payload.id_payment_method,
                    payload.reference_number?.trim() || null,
                    payload.notes?.trim() || null,
                    payload.id_created_by,
                ],
            );

            const nextBalance = Math.max(0, currentBalance - paymentAmount);
            const nextStatus = await this.resolveReceivableStatusByBalance(
                connection,
                nextBalance,
                Number(receivable.amount),
            );

            await this.mySqlService.executeInTx(
                connection,
                `
                UPDATE accounting_receivables
                SET balance = ?,
                    id_receivable_status = ?,
                    id_updated_by = ?
                WHERE id_receivable = ?
                `,
                [nextBalance, nextStatus, payload.id_created_by, idReceivable],
            );

            const autoTransactionType =
                await this.resolveCollectionTransactionTypeInTx(connection);
            const autoTransactionStatus =
                await this.resolveDefaultTransactionStatusInTx(connection);
            const autoCategory = await this.resolveCollectionCategoryInTx(
                connection,
                autoTransactionType,
            );

            if (receivable.id_lead !== null) {
                await this.ensureLeadExistsInTx(connection, Number(receivable.id_lead));
            }

            const autoTransactionInsert = await this.mySqlService.executeInTx(
                connection,
                `
                INSERT INTO accounting_transactions (
                    transaction_date,
                    id_transaction_type,
                    id_transaction_status,
                    id_accounting_category,
                    concept,
                    counterparty,
                    amount,
                    currency_code,
                    id_lead,
                    external_reference,
                    notes,
                    id_created_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    payload.payment_date,
                    autoTransactionType,
                    autoTransactionStatus,
                    autoCategory,
                    `Payment applied to receivable ${receivable.invoice_number}`,
                    receivable.client_name,
                    paymentAmount,
                    receivable.currency_code,
                    receivable.id_lead,
                    payload.reference_number?.trim() || null,
                    payload.notes?.trim() || null,
                    payload.id_created_by,
                ],
            );

            await this.mySqlService.executeInTx(
                connection,
                `
                UPDATE accounting_receivable_payments
                SET id_transaction = ?
                WHERE id_receivable_payment = ?
                `,
                [autoTransactionInsert.insertId, paymentInsert.insertId],
            );

            const paymentRows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
                connection,
                `
                SELECT *
                FROM accounting_receivable_payments
                WHERE id_receivable_payment = ?
                LIMIT 1
                `,
                [paymentInsert.insertId],
            );

            const receivableRows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
                connection,
                `
                SELECT *
                FROM accounting_receivables
                WHERE id_receivable = ?
                LIMIT 1
                `,
                [idReceivable],
            );

            const transactionRows = await this.mySqlService.queryRowsInTx<RowDataPacket>(
                connection,
                `
                SELECT *
                FROM accounting_transactions
                WHERE id_transaction = ?
                LIMIT 1
                `,
                [autoTransactionInsert.insertId],
            );

            return {
                payment: paymentRows[0] ?? null,
                receivable: receivableRows[0] ?? null,
                transaction: transactionRows[0] ?? null,
            };
        });
    }

    async getTreasuryFlow(query: MonthQueryDto) {
        if (!query.month) {
            throw new BadRequestException({
                code: 'MONTH_REQUIRED',
                message: 'month query param is required',
                details: {},
            });
        }

        const { startDate, endDate } = this.getMonthDateRange(query.month);

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT
                at.transaction_date,
                COALESCE(SUM(CASE WHEN tt.sign_multiplier > 0 THEN at.amount ELSE 0 END), 0) AS income_amount,
                COALESCE(SUM(CASE WHEN tt.sign_multiplier < 0 THEN at.amount ELSE 0 END), 0) AS expense_amount,
                COALESCE(SUM(CASE WHEN tt.sign_multiplier > 0 THEN at.amount ELSE -at.amount END), 0) AS net_amount
            FROM accounting_transactions at
            INNER JOIN accounting_transaction_types tt
                ON tt.id_transaction_type = at.id_transaction_type
            WHERE at.deleted_at IS NULL
              AND at.transaction_date BETWEEN ? AND ?
            GROUP BY at.transaction_date
            ORDER BY at.transaction_date ASC
            `,
            [startDate, endDate],
        );

        const totals = rows.reduce(
            (acc, row) => {
                acc.income_total += Number(row.income_amount ?? 0);
                acc.expense_total += Number(row.expense_amount ?? 0);
                acc.net_total += Number(row.net_amount ?? 0);
                return acc;
            },
            {
                income_total: 0,
                expense_total: 0,
                net_total: 0,
            },
        );

        return {
            month: query.month,
            daily: rows,
            totals,
        };
    }

    async createMonthlyClose(payload: CreateMonthlyCloseDto) {
        const { startDate, endDate } = this.getMonthDateRange(payload.month);

        await this.ensureCatalogExists(
            'accounting_monthly_close_statuses',
            'id_monthly_close_status',
            payload.id_monthly_close_status,
        );
        await this.ensureEmployeeExists(payload.id_created_by);

        if (payload.id_closed_by !== undefined) {
            await this.ensureEmployeeExists(payload.id_closed_by);
        }

        const summary = await this.getSummary({ month: payload.month });

        const existingRows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_monthly_close
            FROM accounting_monthly_closes
            WHERE month_key = ?
            LIMIT 1
            `,
            [payload.month],
        );

        if (existingRows[0]) {
            const idMonthlyClose = Number(existingRows[0].id_monthly_close);

            await this.mySqlService.execute(
                `
                UPDATE accounting_monthly_closes
                SET id_monthly_close_status = ?,
                    income_paid = ?,
                    expense_paid = ?,
                    net_result = ?,
                    pending_amount = ?,
                    notes = ?,
                    closed_at = ?,
                    id_closed_by = ?,
                    id_created_by = ?
                WHERE id_monthly_close = ?
                `,
                [
                    payload.id_monthly_close_status,
                    summary.income_total,
                    summary.expense_total,
                    summary.net_total,
                    summary.pending_total,
                    payload.notes?.trim() || null,
                    payload.id_closed_by ? new Date() : null,
                    payload.id_closed_by ?? null,
                    payload.id_created_by,
                    idMonthlyClose,
                ],
            );

            const updated = await this.mySqlService.queryRows<RowDataPacket>(
                `
                SELECT *
                FROM accounting_monthly_closes
                WHERE id_monthly_close = ?
                LIMIT 1
                `,
                [idMonthlyClose],
            );

            return updated[0];
        }

        const result = await this.mySqlService.execute(
            `
            INSERT INTO accounting_monthly_closes (
                month_key,
                id_monthly_close_status,
                income_paid,
                expense_paid,
                net_result,
                pending_amount,
                notes,
                closed_at,
                id_closed_by,
                id_created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                payload.month,
                payload.id_monthly_close_status,
                summary.income_total,
                summary.expense_total,
                summary.net_total,
                summary.pending_total,
                payload.notes?.trim() || null,
                payload.id_closed_by ? new Date() : null,
                payload.id_closed_by ?? null,
                payload.id_created_by,
            ],
        );

        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT *
            FROM accounting_monthly_closes
            WHERE id_monthly_close = ?
            LIMIT 1
            `,
            [result.insertId],
        );

        return {
            period_start: startDate,
            period_end: endDate,
            ...rows[0],
        };
    }
}
