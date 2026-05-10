import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';

@Module({
    controllers: [CatalogsController],
    providers: [CatalogsService, ApiKeyGuard],
})
export class CatalogsModule {}
