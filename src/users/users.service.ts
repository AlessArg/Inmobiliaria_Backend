import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';

@Injectable()
export class UsersService {
    constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

    async listAuthUsers(maxResults = 20, pageToken?: string) {
        const auth = this.firebaseAdminService.getAuthClient();
        const response = await auth.listUsers(maxResults, pageToken);

        return {
            users: response.users.map((user) => ({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                disabled: user.disabled,
                phoneNumber: user.phoneNumber,
                providerData: user.providerData,
                metadata: user.metadata,
            })),
            nextPageToken: response.pageToken ?? null,
        };
    }

    async getAuthUser(uid: string) {
        const auth = this.firebaseAdminService.getAuthClient();
        const user = await auth.getUser(uid);

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            disabled: user.disabled,
            phoneNumber: user.phoneNumber,
            providerData: user.providerData,
            metadata: user.metadata,
        };
    }

    async listFirestoreUsers(limit = 20) {
        const firestore = this.firebaseAdminService.getFirestoreClient();
        const usersSnapshot = await firestore
            .collection('users')
            .limit(limit)
            .get();

        return usersSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
    }

    async getFirestoreUser(uid: string) {
        const firestore = this.firebaseAdminService.getFirestoreClient();
        const userDoc = await firestore.collection('users').doc(uid).get();

        if (!userDoc.exists) {
            throw new NotFoundException(
                `Firestore user with uid ${uid} was not found`,
            );
        }

        return {
            id: userDoc.id,
            ...userDoc.data(),
        };
    }
}
