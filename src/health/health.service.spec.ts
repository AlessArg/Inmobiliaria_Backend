import { HealthService } from './health.service';

describe('HealthService', () => {
    it('returns ok when database is reachable', async () => {
        const queryRows = jest.fn().mockResolvedValue([{ ok: 1 }]);
        const healthService = new HealthService({
            queryRows,
        } as never);

        const result = await healthService.getHealthStatus();

        expect(result.status).toBe('ok');
        expect(result.database).toBe('up');
        expect(typeof result.timestamp).toBe('string');
        expect(typeof result.uptimeSeconds).toBe('number');
        expect(queryRows).toHaveBeenCalledWith('SELECT 1 AS ok');
    });

    it('returns degraded when database is unreachable', async () => {
        const queryRows = jest.fn().mockRejectedValue(new Error('down'));
        const healthService = new HealthService({
            queryRows,
        } as never);

        const result = await healthService.getHealthStatus();

        expect(result.status).toBe('degraded');
        expect(result.database).toBe('down');
        expect(typeof result.timestamp).toBe('string');
        expect(typeof result.uptimeSeconds).toBe('number');
        expect(queryRows).toHaveBeenCalledWith('SELECT 1 AS ok');
    });
});
