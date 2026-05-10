import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { ResponseEnvelopeInterceptor } from './response-envelope.interceptor';

describe('ResponseEnvelopeInterceptor', () => {
    it('wraps successful responses', (done) => {
        const reflector = {
            getAllAndOverride: jest.fn().mockReturnValue(false),
        };
        const interceptor = new ResponseEnvelopeInterceptor(reflector as never);

        const context = {
            getHandler: () => ({}),
            getClass: () => class TestClass {},
            switchToHttp: () => ({
                getRequest: () => ({ method: 'GET', url: '/sample' }),
                getResponse: () => ({ statusCode: 200 }),
            }),
        } as ExecutionContext;

        const next = {
            handle: () => of({ value: 'ok' }),
        };

        interceptor.intercept(context, next as any).subscribe((result: any) => {
            expect(result.success).toBe(true);
            expect(result.statusCode).toBe(200);
            expect(result.method).toBe('GET');
            expect(result.path).toBe('/sample');
            expect(result.data).toEqual({ value: 'ok' });
            done();
        });
    });

    it('does not wrap payload already in envelope format', (done) => {
        const reflector = {
            getAllAndOverride: jest.fn().mockReturnValue(false),
        };
        const interceptor = new ResponseEnvelopeInterceptor(reflector as never);
        const payload = {
            success: true,
            statusCode: 200,
            timestamp: '2026-03-31T00:00:00.000Z',
            data: { hello: 'world' },
        };

        const context = {
            getHandler: () => ({}),
            getClass: () => class TestClass {},
            switchToHttp: () => ({
                getRequest: () => ({ method: 'GET', url: '/sample' }),
                getResponse: () => ({ statusCode: 200 }),
            }),
        } as ExecutionContext;

        const next = {
            handle: () => of(payload),
        };

        interceptor.intercept(context, next as any).subscribe((result: any) => {
            expect(result).toEqual(payload);
            done();
        });
    });
});
