import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

// Este bootstrap levanta NestJS y habilita CORS para el frontend externo.
async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new RequestLoggingInterceptor());
    const frontendUrl = configService.get<string>('FRONTEND_URL')?.trim();
    const mainPageUrl = configService.get<string>('MAIN_PAGE_URL')?.trim();
    const allowedOrigins = [frontendUrl, mainPageUrl].filter(
        (origin): origin is string => Boolean(origin),
    );
    // Esta configuración permite que los frontends definidos en .env consuman el API.
    app.enableCors({
        origin: allowedOrigins.length > 0 ? allowedOrigins : true,
        credentials: true,
    });
    const port = configService.get<number>('PORT') ?? 3000;
    // Este puerto se controla por .env y usa 3000 como fallback.
    await app.listen(port);
}
bootstrap();
