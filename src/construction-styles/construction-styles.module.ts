import { Module } from '@nestjs/common';
import { ConstructionStylesController } from './construction-styles.controller';
import { ConstructionStylesService } from './construction-styles.service';

@Module({
    controllers: [ConstructionStylesController],
    providers: [ConstructionStylesService],
})
export class ConstructionStylesModule {}
