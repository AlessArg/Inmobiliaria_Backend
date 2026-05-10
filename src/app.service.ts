import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
    // Esta respuesta muestra los endpoints principales de autenticación del backend.
    getHello() {
        return {
            message: 'Auth API with Firebase and MySQL',
            mainEndpoint: '/employees/login',
            createEmployeeEndpoint: '/employees',
            firebaseEmailEndpoint: '/auth/login/email',
            firebaseGoogleEndpoint: '/auth/login/google',
            firebaseVerifyEndpoint: '/auth/verify-token',
        };
    }
}
