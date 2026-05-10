import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_RESPONSE_ENVELOPE_KEY } from '../decorators/skip-response-envelope.decorator';

@Injectable()
export class ResponseEnvelopeInterceptor implements NestInterceptor {
    constructor(private readonly reflector: Reflector) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        const skipResponseEnvelope = this.reflector.getAllAndOverride<boolean>(
            SKIP_RESPONSE_ENVELOPE_KEY,
            [context.getHandler(), context.getClass()],
        );

        if (skipResponseEnvelope) {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<Request>();

        return next.handle().pipe(
            map((data: unknown) => {
                if (this.isAlreadyWrapped(data)) {
                    return data;
                }

                return {
                    success: true,
                    statusCode: context.switchToHttp().getResponse().statusCode,
                    message: 'OK',
                    path: request.url,
                    method: request.method,
                    timestamp: new Date().toISOString(),
                    data,
                };
            }),
        );
    }

    private isAlreadyWrapped(data: unknown) {
        if (
            !!data &&
            typeof data === 'object' &&
            'statusCode' in data &&
            'message' in data &&
            !('success' in data)
        ) {
            return true;
        }

        return (
            !!data &&
            typeof data === 'object' &&
            'success' in data &&
            'statusCode' in data &&
            'timestamp' in data
        );
    }
}
