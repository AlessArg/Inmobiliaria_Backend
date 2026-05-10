import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AccountingService } from './accounting.service';
import { CreateMonthlyCloseDto } from './dto/create-monthly-close.dto';
import { CreateReceivablePaymentDto } from './dto/create-receivable-payment.dto';
import { CreateReceivableDto } from './dto/create-receivable.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { ListReceivablesQueryDto } from './dto/list-receivables-query.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { MonthQueryDto } from './dto/month-query.dto';
import { UpdateReceivableDto } from './dto/update-receivable.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@Controller('accounting')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class AccountingController {
    constructor(private readonly accountingService: AccountingService) {}

    @Get('summary')
    getSummary(@Query() query: MonthQueryDto) {
        if (!query.month) {
            throw new BadRequestException({
                code: 'MONTH_REQUIRED',
                message: 'month query param is required',
                details: {},
            });
        }

        return this.accountingService.getSummary(query);
    }

    @Get('transactions')
    getTransactions(@Query() query: ListTransactionsQueryDto) {
        return this.accountingService.getTransactions(query);
    }

    @Post('transactions')
    createTransaction(@Body() payload: CreateTransactionDto) {
        return this.accountingService.createTransaction(payload);
    }

    @Patch('transactions/:id_transaction')
    updateTransaction(
        @Param('id_transaction', ParseIntPipe) idTransaction: number,
        @Body() payload: UpdateTransactionDto,
    ) {
        return this.accountingService.updateTransaction(idTransaction, payload);
    }

    @Get('receivables')
    getReceivables(@Query() query: ListReceivablesQueryDto) {
        return this.accountingService.getReceivables(query);
    }

    @Post('receivables')
    createReceivable(@Body() payload: CreateReceivableDto) {
        return this.accountingService.createReceivable(payload);
    }

    @Patch('receivables/:id_receivable')
    updateReceivable(
        @Param('id_receivable', ParseIntPipe) idReceivable: number,
        @Body() payload: UpdateReceivableDto,
    ) {
        return this.accountingService.updateReceivable(idReceivable, payload);
    }

    @Post('receivables/:id_receivable/payments')
    createReceivablePayment(
        @Param('id_receivable', ParseIntPipe) idReceivable: number,
        @Body() payload: CreateReceivablePaymentDto,
    ) {
        return this.accountingService.createReceivablePayment(idReceivable, payload);
    }

    @Get('treasury/flow')
    getTreasuryFlow(@Query() query: MonthQueryDto) {
        if (!query.month) {
            throw new BadRequestException({
                code: 'MONTH_REQUIRED',
                message: 'month query param is required',
                details: {},
            });
        }

        return this.accountingService.getTreasuryFlow(query);
    }

    @Post('monthly-closes')
    createMonthlyClose(@Body() payload: CreateMonthlyCloseDto) {
        return this.accountingService.createMonthlyClose(payload);
    }
}
