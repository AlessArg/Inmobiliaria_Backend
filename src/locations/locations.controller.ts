import {
    BadRequestException,
    Controller,
    Get,
    Param,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { GetMunicipalitiesByCityDto } from './dto/get-municipalities-by-city.dto';
import { LocationsService } from './locations.service';

@Controller('locations')
@UseGuards(ApiKeyGuard)
export class LocationsController {
    constructor(private readonly locationsService: LocationsService) {}

    @Get('cities')
    getAllCities() {
        return this.locationsService.getAllCities();
    }

    @Get('cities/:id_city/municipalities')
    getMunicipalitiesByCity(@Param() params: GetMunicipalitiesByCityDto) {
        const idCity = params.id_city;
        if (typeof idCity !== 'number' || !Number.isInteger(idCity) || idCity <= 0) {
            throw new BadRequestException('id_city must be a positive integer');
        }

        return this.locationsService.getMunicipalitiesByCityId(idCity);
    }
}
