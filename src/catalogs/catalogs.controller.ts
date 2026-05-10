import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CatalogListQueryDto } from './dto/catalog-list-query.dto';
import { CatalogsService } from './catalogs.service';

@Controller('catalogs')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class CatalogsController {
    constructor(private readonly catalogsService: CatalogsService) {}

    @Get('attendance-event-types')
    getAttendanceEventTypes(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('attendance-event-types', query);
    }

    @Get('accounting-transaction-types')
    getAccountingTransactionTypes(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('accounting-transaction-types', query);
    }

    @Get('accounting-transaction-statuses')
    getAccountingTransactionStatuses(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('accounting-transaction-statuses', query);
    }

    @Get('accounting-receivable-statuses')
    getAccountingReceivableStatuses(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('accounting-receivable-statuses', query);
    }

    @Get('accounting-payment-methods')
    getAccountingPaymentMethods(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('accounting-payment-methods', query);
    }

    @Get('accounting-monthly-close-statuses')
    getAccountingMonthlyCloseStatuses(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('accounting-monthly-close-statuses', query);
    }

    @Get('accounting-categories')
    getAccountingCategories(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('accounting-categories', query);
    }

    @Get('hr-leave-request-statuses')
    getHrLeaveRequestStatuses(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-leave-request-statuses', query);
    }

    @Get('hr-payroll-run-statuses')
    getHrPayrollRunStatuses(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-payroll-run-statuses', query);
    }

    @Get('hr-payroll-concept-types')
    getHrPayrollConceptTypes(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-payroll-concept-types', query);
    }

    @Get('hr-payroll-concepts')
    getHrPayrollConcepts(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-payroll-concepts', query);
    }

    @Get('hr-position-statuses')
    getHrPositionStatuses(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-position-statuses', query);
    }

    @Get('hr-recruitment-stages')
    getHrRecruitmentStages(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-recruitment-stages', query);
    }

    @Get('hr-recruitment-sources')
    getHrRecruitmentSources(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-recruitment-sources', query);
    }

    @Get('hr-interview-types')
    getHrInterviewTypes(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-interview-types', query);
    }

    @Get('hr-interview-results')
    getHrInterviewResults(@Query() query: CatalogListQueryDto) {
        return this.catalogsService.listCatalog('hr-interview-results', query);
    }
}
