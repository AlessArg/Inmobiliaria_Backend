import {
    CallHandler,
    ExecutionContext,
    HttpException,
    Injectable,
    Logger,
    NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger(RequestLoggingInterceptor.name);

    intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Observable<unknown> {
        const now = Date.now();
        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        const response = http.getResponse<Response>();
        const route = `${request.method} ${request.url}`;

        return next.handle().pipe(
            tap({
                next: () => {
                    const ms = Date.now() - now;
                    this.logger.log(`${route} ${response.statusCode} +${ms}ms`);
                },
                error: (error: unknown) => {
                    const ms = Date.now() - now;
                    const errorStatus =
                        error instanceof HttpException
                            ? error.getStatus()
                            : 500;
                    const statusCode = Number(errorStatus);
                    const message = `${route} ${statusCode} +${ms}ms`;

                    if (statusCode >= 500) {
                        this.logger.error(message);
                        return;
                    }

                    if (statusCode >= 400) {
                        this.logger.warn(message);
                        return;
                    }

                    this.logger.log(message);
                },
            }),
        );
    }
}
