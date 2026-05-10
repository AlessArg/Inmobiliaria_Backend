import { Injectable } from '@nestjs/common';
import { MySqlService } from '../database/mysql.service';

@Injectable()
export class HealthService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getHealthStatus() {
        const now = new Date().toISOString();

        try {
            await this.mySqlService.queryRows('SELECT 1 AS ok');
            return {
                status: 'ok',
                database: 'up',
                timestamp: now,
                uptimeSeconds: Number(process.uptime().toFixed(0)),
            };
        } catch {
            return {
                status: 'degraded',
                database: 'down',
                timestamp: now,
                uptimeSeconds: Number(process.uptime().toFixed(0)),
            };
        }
    }
}
