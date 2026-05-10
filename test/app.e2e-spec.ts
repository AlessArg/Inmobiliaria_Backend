import {
    BadRequestException,
    Body,
    Controller,
    Get,
    INestApplication,
    Post,
    ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { IsNotEmpty, IsString } from 'class-validator';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RequestLoggingInterceptor } from '../src/common/interceptors/request-logging.interceptor';
import { ResponseEnvelopeInterceptor } from '../src/common/interceptors/response-envelope.interceptor';

class EchoDto {
    @IsString()
    @IsNotEmpty()
    value: string;
}

@Controller('test')
class TestController {
    @Get('error')
    throwError() {
        throw new BadRequestException('forced error');
    }

    @Post('echo')
    echo(@Body() body: EchoDto) {
        return body;
    }
}

describe('AppController (e2e)', () => {
    let app: INestApplication;

    beforeEach(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [AppController, TestController],
            providers: [AppService],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                transform: true,
                whitelist: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalFilters(new HttpExceptionFilter());
        app.useGlobalInterceptors(
            new RequestLoggingInterceptor(),
            new ResponseEnvelopeInterceptor(),
        );
        await app.init();
    });

    afterEach(async () => {
        await app.close();
    });

    it('/ (GET)', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect((response) => {
                expect(response.body.success).toBe(true);
                expect(response.body.statusCode).toBe(200);
                expect(response.body.data.message).toBe(
                    'Auth API with Firebase and MySQL',
                );
            });
    });

    it('/test/error (GET) returns standardized error envelope', () => {
        return request(app.getHttpServer())
            .get('/test/error')
            .expect(400)
            .expect((response) => {
                expect(response.body.success).toBe(false);
                expect(response.body.statusCode).toBe(400);
                expect(response.body.message).toBe('forced error');
                expect(response.body.path).toBe('/test/error');
                expect(response.body.method).toBe('GET');
                expect(response.body.timestamp).toBeDefined();
            });
    });

    it('/test/echo (POST) returns validation envelope when body is invalid', () => {
        return request(app.getHttpServer())
            .post('/test/echo')
            .send({})
            .expect(400)
            .expect((response) => {
                expect(response.body.success).toBe(false);
                expect(response.body.statusCode).toBe(400);
                expect(response.body.message).toBe('Validation failed');
                expect(Array.isArray(response.body.details)).toBe(true);
            });
    });
});
