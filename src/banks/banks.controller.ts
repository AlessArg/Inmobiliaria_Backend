import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateBankDto } from './dto/create-bank.dto';
import { BanksService } from './banks.service';

@Controller('banks')
@UseGuards(ApiKeyGuard)
@SkipResponseEnvelope()
export class BanksController {
    constructor(private readonly banksService: BanksService) {}

    @Get()
    getBanks() {
        return this.banksService.getBanks();
    }

    @Get(':id_bank')
    getBankById(@Param('id_bank', ParseIntPipe) idBank: number) {
        return this.banksService.getBankById(idBank);
    }

    @Post()
    createBank(@Body() payload: CreateBankDto) {
        return this.banksService.createBank(payload);
    }
}
