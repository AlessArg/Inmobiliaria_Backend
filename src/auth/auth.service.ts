import {
    BadRequestException,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';

type EmailPasswordFirebaseResponse = {
    localId: string;
    email: string;
    displayName?: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
};

type GoogleFirebaseResponse = {
    localId: string;
    email?: string;
    displayName?: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    providerId?: string;
};

// Este servicio encapsula integración con Firebase Auth REST y Firebase Admin.
@Injectable()
export class AuthService {
    constructor(
        private readonly configService: ConfigService,
        private readonly firebaseAdminService: FirebaseAdminService,
    ) {}

    // Este método obtiene la apiKey web de Firebase usada para llamadas REST.
    private getWebApiKey() {
        const webApiKey = this.configService.get<string>(
            'FIREBASE_WEB_API_KEY',
        );
        if (!webApiKey) {
            throw new BadRequestException(
                'Missing FIREBASE_WEB_API_KEY in environment variables',
            );
        }

        return webApiKey;
    }

    // Este método ejecuta llamadas HTTP a Firebase Auth y normaliza errores.
    private async callFirebase<T>(
        endpoint: string,
        payload: Record<string, unknown>,
    ) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const data = (await response.json()) as {
            error?: { message?: string };
        } & T;
        if (!response.ok) {
            throw new UnauthorizedException(
                data.error?.message ?? 'Firebase authentication failed',
            );
        }

        return data;
    }

    // Este método realiza login por email/password en Firebase.
    async loginWithEmailPassword(email: string, password: string) {
        const webApiKey = this.getWebApiKey();
        const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${webApiKey}`;

        const response = await this.callFirebase<EmailPasswordFirebaseResponse>(
            endpoint,
            {
                email,
                password,
                returnSecureToken: true,
            },
        );

        const decodedToken = await this.verifyIdToken(response.idToken);

        return {
            provider: 'password',
            firebaseUserId: response.localId,
            email: response.email,
            displayName: response.displayName ?? null,
            idToken: response.idToken,
            refreshToken: response.refreshToken,
            expiresIn: Number(response.expiresIn),
            decodedToken,
        };
    }

    // Este método realiza login con proveedor Google en Firebase.
    async loginWithGoogle(googleIdToken?: string, googleAccessToken?: string) {
        if (!googleIdToken && !googleAccessToken) {
            throw new BadRequestException(
                'You must provide googleIdToken or googleAccessToken',
            );
        }

        const webApiKey = this.getWebApiKey();
        const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${webApiKey}`;

        const postBody = googleIdToken
            ? `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`
            : `access_token=${encodeURIComponent(googleAccessToken as string)}&providerId=google.com`;

        const response = await this.callFirebase<GoogleFirebaseResponse>(
            endpoint,
            {
                postBody,
                requestUri: 'http://localhost',
                returnSecureToken: true,
                returnIdpCredential: true,
            },
        );

        const decodedToken = await this.verifyIdToken(response.idToken);

        return {
            provider: 'google.com',
            firebaseUserId: response.localId,
            email: response.email ?? null,
            displayName: response.displayName ?? null,
            idToken: response.idToken,
            refreshToken: response.refreshToken,
            expiresIn: Number(response.expiresIn),
            decodedToken,
        };
    }

    // Este método valida y decodifica un ID token firmado por Firebase.
    async verifyIdToken(idToken: string) {
        const auth = this.firebaseAdminService.getAuthClient();
        return auth.verifyIdToken(idToken, true);
    }
}
