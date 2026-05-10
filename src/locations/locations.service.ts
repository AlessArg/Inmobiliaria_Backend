import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';

type CityRow = RowDataPacket & {
    id_city: number;
    city_name: string | null;
};

type MunicipalityRow = RowDataPacket & {
    id_municipality: number;
    municipality_name: string | null;
    id_city: number;
};

@Injectable()
export class LocationsService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getAllCities() {
        return this.mySqlService.queryRows<CityRow>(
            `
            SELECT id_city, city_name
            FROM cities
            ORDER BY city_name ASC
            `,
            [],
        );
    }

    private async ensureCityExists(idCity: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_city
            FROM cities
            WHERE id_city = ?
            LIMIT 1
            `,
            [idCity],
        );

        if (!rows[0]) {
            throw new NotFoundException(`City with id_city ${idCity} was not found`);
        }
    }

    async getMunicipalitiesByCityId(idCity: number) {
        if (!Number.isInteger(idCity) || idCity <= 0) {
            throw new BadRequestException('id_city must be a positive integer');
        }

        await this.ensureCityExists(idCity);

        return this.mySqlService.queryRows<MunicipalityRow>(
            `
            SELECT id_municipality, municipality_name, id_city
            FROM municipalities
            WHERE id_city = ?
            ORDER BY municipality_name ASC
            `,
            [idCity],
        );
    }
}
