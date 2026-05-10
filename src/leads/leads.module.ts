import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
    controllers: [LeadsController],
    providers: [LeadsService, ApiKeyGuard],
})
export class LeadsModule {}
