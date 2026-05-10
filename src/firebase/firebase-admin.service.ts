import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseAdminService {
    constructor(private readonly configService: ConfigService) {}

    private getOrCreateApp() {
        const existingApps = getApps();
        if (existingApps.length > 0) {
            return existingApps[0];
        }

        const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = this.configService.get<string>(
            'FIREBASE_CLIENT_EMAIL',
        );
        const privateKey = this.configService.get<string>(
            'FIREBASE_PRIVATE_KEY',
        );
        const databaseURL = this.configService.get<string>(
            'FIREBASE_DATABASE_URL',
        );
        const storageBucket = this.configService.get<string>(
            'FIREBASE_STORAGE_BUCKET',
        );

        if (!projectId || !clientEmail || !privateKey) {
            throw new InternalServerErrorException(
                'Missing Firebase environment variables. Check FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.',
            );
        }

        return initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
            databaseURL,
            storageBucket,
        });
    }

    getAuthClient() {
        return getAuth(this.getOrCreateApp());
    }

    getFirestoreClient() {
        return getFirestore(this.getOrCreateApp());
    }
}
