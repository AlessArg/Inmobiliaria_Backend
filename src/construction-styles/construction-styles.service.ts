import {
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateConstructionStyleDto } from './dto/create-construction-style.dto';

type ConstructionStyleRow = RowDataPacket & {
    id_construction_style: number;
    construction_style_name: string | null;
};

@Injectable()
export class ConstructionStylesService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getAllConstructionStyles() {
        return this.mySqlService.queryRows<ConstructionStyleRow>(
            `
            SELECT id_construction_style, construction_style_name
            FROM construction_styles
            ORDER BY id_construction_style DESC
            `,
            [],
        );
    }

    async getConstructionStyleById(idConstructionStyle: number) {
        const rows = await this.mySqlService.queryRows<ConstructionStyleRow>(
            `
            SELECT id_construction_style, construction_style_name
            FROM construction_styles
            WHERE id_construction_style = ?
            LIMIT 1
            `,
            [idConstructionStyle],
        );

        const style = rows[0];
        if (!style) {
            throw new NotFoundException(
                `Construction style with id_construction_style ${idConstructionStyle} not found`,
            );
        }

        return style;
    }

    async createConstructionStyle(payload: CreateConstructionStyleDto) {
        const normalizedName = payload.construction_style_name.trim();

        const insertResult = await this.mySqlService.execute(
            `
            INSERT INTO construction_styles (construction_style_name)
            VALUES (?)
            `,
            [normalizedName],
        );

        return this.getConstructionStyleById(insertResult.insertId);
    }
}
