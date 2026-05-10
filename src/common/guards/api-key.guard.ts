import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Este guard valida una API key enviada en el header x-api-key.
@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    private getExpectedXpiKey() {
        const explicitXpi =
            this.configService.get<string>('XPI_KEY')?.trim() ??
            this.configService.get<string>('BACKEND_XPI_KEY')?.trim();

        if (explicitXpi) {
            return explicitXpi;
        }

        return this.configService.get<string>('BACKEND_API_KEY')?.trim() ?? null;
    }

    canActivate(context: ExecutionContext): boolean {
        const request = context
            .switchToHttp()
            .getRequest<{ headers: Record<string, string | undefined> }>();
        const incomingApiKey = request.headers['x-api-key']?.trim();
        const incomingXpiKey = request.headers['xpi-key']?.trim();

        const expectedApiKey =
            this.configService.get<string>('BACKEND_API_KEY')?.trim() ?? null;
        const expectedXpiKey = this.getExpectedXpiKey();

        if (!expectedApiKey) {
            throw new UnauthorizedException({
                code: 'AUTH_CONFIGURATION_MISSING',
                message: 'BACKEND_API_KEY is not configured in .env',
                details: {},
            });
        }

        if (!expectedXpiKey) {
            throw new UnauthorizedException({
                code: 'AUTH_CONFIGURATION_MISSING',
                message: 'XPI_KEY or BACKEND_XPI_KEY is not configured in .env',
                details: {},
            });
        }

        if (!incomingApiKey || incomingApiKey !== expectedApiKey) {
            throw new UnauthorizedException({
                code: 'AUTH_INVALID_X_API_KEY',
                message: 'Invalid x-api-key header',
                details: {},
            });
        }

        if (!incomingXpiKey || incomingXpiKey !== expectedXpiKey) {
            throw new UnauthorizedException({
                code: 'AUTH_INVALID_XPI_KEY',
                message: 'Invalid xpi-key header',
                details: {},
            });
        }

        return true;
    }
}
