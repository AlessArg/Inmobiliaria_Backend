import { BadRequestException, Injectable } from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import {
    buildPaginationMeta,
    resolvePagination,
} from '../common/utils/pagination.util';
import { MySqlService } from '../database/mysql.service';
import { CatalogListQueryDto } from './dto/catalog-list-query.dto';

type CatalogConfig = {
    tableName: string;
    idColumn: string;
    codeColumn: string;
    nameColumn: string;
    activeColumn?: string;
    extraSearchColumns?: string[];
};

type CountRow = RowDataPacket & {
    total: number;
};

@Injectable()
export class CatalogsService {
    private readonly catalogConfigs: Record<string, CatalogConfig> = {
        'attendance-event-types': {
            tableName: 'attendance_event_types',
            idColumn: 'id_attendance_event_type',
            codeColumn: 'event_code',
            nameColumn: 'event_name',
            activeColumn: 'is_active',
        },
        'accounting-transaction-types': {
            tableName: 'accounting_transaction_types',
            idColumn: 'id_transaction_type',
            codeColumn: 'type_code',
            nameColumn: 'type_name',
            activeColumn: 'is_active',
        },
        'accounting-transaction-statuses': {
            tableName: 'accounting_transaction_statuses',
            idColumn: 'id_transaction_status',
            codeColumn: 'status_code',
            nameColumn: 'status_name',
            activeColumn: 'is_active',
        },
        'accounting-receivable-statuses': {
            tableName: 'accounting_receivable_statuses',
            idColumn: 'id_receivable_status',
            codeColumn: 'status_code',
            nameColumn: 'status_name',
            activeColumn: 'is_active',
        },
        'accounting-payment-methods': {
            tableName: 'accounting_payment_methods',
            idColumn: 'id_payment_method',
            codeColumn: 'method_code',
            nameColumn: 'method_name',
            activeColumn: 'is_active',
        },
        'accounting-monthly-close-statuses': {
            tableName: 'accounting_monthly_close_statuses',
            idColumn: 'id_monthly_close_status',
            codeColumn: 'status_code',
            nameColumn: 'status_name',
            activeColumn: 'is_active',
        },
        'accounting-categories': {
            tableName: 'accounting_categories',
            idColumn: 'id_accounting_category',
            codeColumn: 'category_code',
            nameColumn: 'category_name',
            activeColumn: 'is_active',
        },
        'hr-leave-request-statuses': {
            tableName: 'hr_leave_request_statuses',
            idColumn: 'id_leave_request_status',
            codeColumn: 'status_code',
            nameColumn: 'status_name',
            activeColumn: 'is_active',
        },
        'hr-payroll-run-statuses': {
            tableName: 'hr_payroll_run_statuses',
            idColumn: 'id_payroll_run_status',
            codeColumn: 'status_code',
            nameColumn: 'status_name',
            activeColumn: 'is_active',
        },
        'hr-payroll-concept-types': {
            tableName: 'hr_payroll_concept_types',
            idColumn: 'id_payroll_concept_type',
            codeColumn: 'type_code',
            nameColumn: 'type_name',
            activeColumn: 'is_active',
        },
        'hr-payroll-concepts': {
            tableName: 'hr_payroll_concepts',
            idColumn: 'id_payroll_concept',
            codeColumn: 'concept_code',
            nameColumn: 'concept_name',
            activeColumn: 'is_active',
        },
        'hr-position-statuses': {
            tableName: 'hr_position_statuses',
            idColumn: 'id_position_status',
            codeColumn: 'status_code',
            nameColumn: 'status_name',
            activeColumn: 'is_active',
        },
        'hr-recruitment-stages': {
            tableName: 'hr_recruitment_stages',
            idColumn: 'id_recruitment_stage',
            codeColumn: 'stage_code',
            nameColumn: 'stage_name',
            activeColumn: 'is_active',
            extraSearchColumns: ['stage_order'],
        },
        'hr-recruitment-sources': {
            tableName: 'hr_recruitment_sources',
            idColumn: 'id_recruitment_source',
            codeColumn: 'source_code',
            nameColumn: 'source_name',
            activeColumn: 'is_active',
        },
        'hr-interview-types': {
            tableName: 'hr_interview_types',
            idColumn: 'id_interview_type',
            codeColumn: 'type_code',
            nameColumn: 'type_name',
            activeColumn: 'is_active',
        },
        'hr-interview-results': {
            tableName: 'hr_interview_results',
            idColumn: 'id_interview_result',
            codeColumn: 'result_code',
            nameColumn: 'result_name',
            activeColumn: 'is_active',
        },
    };

    constructor(private readonly mySqlService: MySqlService) {}

    async listCatalog(catalogKey: string, query: CatalogListQueryDto) {
        const config = this.catalogConfigs[catalogKey];
        if (!config) {
            throw new BadRequestException({
                code: 'CATALOG_KEY_INVALID',
                message: `Catalog ${catalogKey} is not supported`,
                details: { catalog_key: catalogKey },
            });
        }

        const pagination = resolvePagination({
            page: query.page,
            page_size: query.page_size,
        });

        const conditions: string[] = [];
        const params: Array<string | number> = [];

        if (query.active !== undefined) {
            if (!config.activeColumn) {
                throw new BadRequestException({
                    code: 'CATALOG_ACTIVE_FILTER_UNSUPPORTED',
                    message: `Catalog ${catalogKey} does not support active filter`,
                    details: { catalog_key: catalogKey },
                });
            }

            conditions.push(`${config.activeColumn} = ?`);
            params.push(Number(query.active));
        }

        const normalizedSearch = query.search?.trim();
        if (normalizedSearch) {
            const searchColumns = [
                config.codeColumn,
                config.nameColumn,
                ...(config.extraSearchColumns ?? []),
            ];

            const searchParts = searchColumns.map((columnName) => `${columnName} LIKE ?`);
            conditions.push(`(${searchParts.join(' OR ')})`);
            for (const _ of searchColumns) {
                params.push(`%${normalizedSearch}%`);
            }
        }

        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

        const countRows = await this.mySqlService.queryRows<CountRow>(
            `
            SELECT COUNT(*) AS total
            FROM ${config.tableName}
            ${whereClause}
            `,
            params,
        );

        const totalItems = Number(countRows[0]?.total ?? 0);

        const items = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT *
            FROM ${config.tableName}
            ${whereClause}
            ORDER BY ${config.nameColumn} ASC, ${config.idColumn} ASC
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
}
