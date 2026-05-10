import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let appController: AppController;

    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        appController = app.get<AppController>(AppController);
    });

    describe('root', () => {
        it('should return auth API main endpoints', () => {
            expect(appController.getHello()).toEqual({
                message: 'Auth API with Firebase and MySQL',
                mainEndpoint: '/employees/login',
                createEmployeeEndpoint: '/employees',
                firebaseEmailEndpoint: '/auth/login/email',
                firebaseGoogleEndpoint: '/auth/login/google',
                firebaseVerifyEndpoint: '/auth/verify-token',
            });
        });
    });
});
