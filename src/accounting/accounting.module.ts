import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { AccountingController } from './accounting.controller';
import { AccountingService } from './accounting.service';

@Module({
    controllers: [AccountingController],
    providers: [AccountingService, ApiKeyGuard],
})
export class AccountingModule {}
