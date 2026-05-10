import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        context.getRequest<Request>();

        const statusCode =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse =
            exception instanceof HttpException ? exception.getResponse() : null;

        const code = this.resolveCode(exceptionResponse, statusCode);
        const message = this.resolveMessage(exceptionResponse, exception);
        const details = this.resolveDetails(exceptionResponse);

        response.status(statusCode).json({
            error: true,
            code,
            message,
            details,
        });
    }

    private resolveCode(exceptionResponse: unknown, statusCode: number): string {
        if (
            exceptionResponse &&
            typeof exceptionResponse === 'object' &&
            'code' in exceptionResponse
        ) {
            const code = (exceptionResponse as { code?: unknown }).code;
            if (typeof code === 'string' && code.trim()) {
                return code.trim();
            }
        }

        if (statusCode === HttpStatus.BAD_REQUEST) {
            return 'BAD_REQUEST';
        }

        if (statusCode === HttpStatus.UNAUTHORIZED) {
            return 'UNAUTHORIZED';
        }

        if (statusCode === HttpStatus.FORBIDDEN) {
            return 'FORBIDDEN';
        }

        if (statusCode === HttpStatus.NOT_FOUND) {
            return 'NOT_FOUND';
        }

        if (statusCode === HttpStatus.CONFLICT) {
            return 'CONFLICT';
        }

        if (statusCode === HttpStatus.UNPROCESSABLE_ENTITY) {
            return 'UNPROCESSABLE_ENTITY';
        }

        if (statusCode === HttpStatus.SERVICE_UNAVAILABLE) {
            return 'SERVICE_UNAVAILABLE';
        }

        return 'INTERNAL_SERVER_ERROR';
    }

    private resolveMessage(
        exceptionResponse: unknown,
        exception: unknown,
    ): string {
        if (typeof exceptionResponse === 'string') {
            return exceptionResponse;
        }

        if (
            exceptionResponse &&
            typeof exceptionResponse === 'object' &&
            'message' in exceptionResponse
        ) {
            const message = (exceptionResponse as { message?: unknown }).message;
            if (typeof message === 'string') {
                return message;
            }
            if (Array.isArray(message)) {
                return 'Validation failed';
            }
        }

        if (exception instanceof Error) {
            return exception.message;
        }

        return 'Internal server error';
    }

    private resolveDetails(exceptionResponse: unknown) {
        if (
            exceptionResponse &&
            typeof exceptionResponse === 'object' &&
            'details' in exceptionResponse
        ) {
            const details = (exceptionResponse as { details?: unknown }).details;
            if (details && typeof details === 'object') {
                return details;
            }
        }

        if (
            exceptionResponse &&
            typeof exceptionResponse === 'object' &&
            'message' in exceptionResponse
        ) {
            const message = (exceptionResponse as { message?: unknown }).message;
            if (Array.isArray(message)) {
                return {
                    validation_errors: message,
                };
            }
        }

        return {};
    }
}
