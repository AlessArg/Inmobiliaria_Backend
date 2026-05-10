import { HttpException, HttpStatus } from '@nestjs/common';

export type DomainErrorDetails = Record<string, unknown>;

export type DomainErrorPayload = {
    code: string;
    message: string;
    details?: DomainErrorDetails;
};

export class DomainException extends HttpException {
    readonly code: string;

    constructor(status: HttpStatus, payload: DomainErrorPayload) {
        super(
            {
                code: payload.code,
                message: payload.message,
                details: payload.details ?? {},
            },
            status,
        );

        this.code = payload.code;
    }
}
