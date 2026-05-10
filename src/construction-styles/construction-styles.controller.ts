import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateConstructionStyleDto } from './dto/create-construction-style.dto';
import { ConstructionStylesService } from './construction-styles.service';

@Controller('construction-styles')
@UseGuards(ApiKeyGuard)
export class ConstructionStylesController {
    constructor(
        private readonly constructionStylesService: ConstructionStylesService,
    ) {}

    @Get()
    getAllConstructionStyles() {
        return this.constructionStylesService.getAllConstructionStyles();
    }

    @Get(':id_construction_style')
    getConstructionStyleById(
        @Param('id_construction_style', ParseIntPipe)
        idConstructionStyle: number,
    ) {
        if (idConstructionStyle <= 0) {
            throw new BadRequestException(
                'id_construction_style must be a positive integer',
            );
        }

        return this.constructionStylesService.getConstructionStyleById(idConstructionStyle);
    }

    @Post()
    createConstructionStyle(@Body() payload: CreateConstructionStyleDto) {
        return this.constructionStylesService.createConstructionStyle(payload);
    }
}
