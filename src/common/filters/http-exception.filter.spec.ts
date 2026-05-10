import { BadRequestException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
    it('formats http exceptions with standardized envelope', () => {
        const filter = new HttpExceptionFilter();
        const json = jest.fn();
        const status = jest.fn(() => ({ json }));

        const host = {
            switchToHttp: () => ({
                getRequest: () => ({ url: '/test/error', method: 'GET' }),
                getResponse: () => ({ status }),
            }),
        } as any;

        filter.catch(new BadRequestException('forced error'), host);

        expect(status).toHaveBeenCalledWith(400);
        const responsePayload = json.mock.calls[0][0];
        expect(responsePayload.success).toBe(false);
        expect(responsePayload.statusCode).toBe(400);
        expect(responsePayload.message).toBe('forced error');
        expect(responsePayload.path).toBe('/test/error');
        expect(responsePayload.method).toBe('GET');
    });

    it('formats unknown exceptions as internal server error', () => {
        const filter = new HttpExceptionFilter();
        const json = jest.fn();
        const status = jest.fn(() => ({ json }));

        const host = {
            switchToHttp: () => ({
                getRequest: () => ({ url: '/test/unknown', method: 'POST' }),
                getResponse: () => ({ status }),
            }),
        } as any;

        filter.catch(new Error('unexpected'), host);

        expect(status).toHaveBeenCalledWith(500);
        const responsePayload = json.mock.calls[0][0];
        expect(responsePayload.success).toBe(false);
        expect(responsePayload.statusCode).toBe(500);
        expect(responsePayload.message).toBe('unexpected');
        expect(responsePayload.path).toBe('/test/unknown');
        expect(responsePayload.method).toBe('POST');
    });
});
