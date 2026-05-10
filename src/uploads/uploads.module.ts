import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { UploadsController } from './uploads.controller';

@Module({
    controllers: [UploadsController],
    providers: [ApiKeyGuard],
})
export class UploadsModule {}
