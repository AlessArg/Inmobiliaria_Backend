import {
    Body,
    Controller,
    Delete,
    Get,
    ParseArrayPipe,
    ParseIntPipe,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { SkipResponseEnvelope } from '../common/decorators/skip-response-envelope.decorator';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';
import { HousesService } from './houses.service';

@Controller('houses')
@UseGuards(ApiKeyGuard)
export class HousesController {
    constructor(private readonly housesService: HousesService) {}

    @Get()
    getAllHouses() {
        return this.housesService.getAllHouses();
    }

    @Get('project/:id_project')
    getHousesByProjectId(@Param('id_project', ParseIntPipe) idProject: number) {
        return this.housesService.getHousesByProjectId(idProject);
    }

    @Get('project/:id_project/active')
    getActiveHousesByProjectId(
        @Param('id_project', ParseIntPipe) idProject: number,
    ) {
        return this.housesService.getActiveHousesByProjectId(idProject);
    }

    @Get(':id_house')
    @SkipResponseEnvelope()
    getHouseById(@Param('id_house', ParseIntPipe) idHouse: number) {
        return this.housesService.getHouseById(idHouse);
    }

    @Post()
    createHouse(@Body() payload: CreateHouseDto) {
        return this.housesService.createHouse(payload);
    }

    @Post('bulk')
    createManyHouses(
        @Body(
            new ParseArrayPipe({
                items: CreateHouseDto,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        )
        payload: CreateHouseDto[],
    ) {
        return this.housesService.createManyHouses(payload);
    }

    @Patch(':id_house')
    updateHouse(
        @Param('id_house', ParseIntPipe) idHouse: number,
        @Body() payload: UpdateHouseDto,
    ) {
        return this.housesService.updateHouse(idHouse, payload);
    }

    @Delete(':id_house')
    deleteHouse(@Param('id_house', ParseIntPipe) idHouse: number) {
        return this.housesService.deleteHouse(idHouse);
    }
}
