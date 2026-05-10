import { Injectable } from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';

type RejectionReasonRow = RowDataPacket & {
    id_rejection_reason: number;
    rejection_reason_name: string | null;
};

@Injectable()
export class RejectionReasonsService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getRejectionReasons() {
        return this.mySqlService.queryRows<RejectionReasonRow>(
            `
            SELECT *
            FROM rejection_reasons
            ORDER BY id_rejection_reason ASC
            `,
            [],
        );
    }
}
