import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

type CloudinaryUploadResourceType = 'image' | 'raw' | 'auto';
type CloudinaryDeleteResourceType = 'image' | 'raw' | 'video';
type CloudinarySignResourceType = 'image' | 'raw' | 'video';

const ALLOWED_CLOUDINARY_FOLDERS = [
    'houses_photos',
    'lead_documents',
    'project_logos',
    'project_photos',
    'team_photos',
    'user_photos',
] as const;

type AllowedCloudinaryFolder = (typeof ALLOWED_CLOUDINARY_FOLDERS)[number];

@Injectable()
export class CloudinaryService {
    private isConfigured = false;

    constructor(private readonly configService: ConfigService) {}

    private getEnvValue(primaryKey: string, legacyKey: string) {
        const primaryValue = this.configService.get<string>(primaryKey)?.trim();
        if (primaryValue) {
            return primaryValue;
        }

        const legacyValue = this.configService.get<string>(legacyKey)?.trim();
        if (legacyValue) {
            return legacyValue;
        }

        return null;
    }

    private ensureConfigured() {
        if (this.isConfigured) {
            return;
        }

        const cloudName = this.getEnvValue('CLOUDINARY_NAME', 'CLAUDINARY_NAME');
        const apiKey = this.getEnvValue('CLOUDINARY_API_KEY', 'CLAUDINARY_API_KEY');
        const apiSecret = this.getEnvValue(
            'CLOUDINARY_SECRET',
            'CLAUDINARY_SECRET',
        );

        if (!cloudName || !apiKey || !apiSecret) {
            throw new InternalServerErrorException(
                'Cloudinary credentials are missing. Set CLOUDINARY_* (or CLAUDINARY_* legacy keys) in .env',
            );
        }

        cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret,
            secure: true,
        });

        this.isConfigured = true;
    }

    private isCloudinaryUrl(url: string) {
        return /https?:\/\/res\.cloudinary\.com\//i.test(url);
    }

    private assertAllowedFolder(folder: string): asserts folder is AllowedCloudinaryFolder {
        if (!ALLOWED_CLOUDINARY_FOLDERS.includes(folder as AllowedCloudinaryFolder)) {
            throw new InternalServerErrorException(
                `Invalid Cloudinary folder: ${folder}`,
            );
        }
    }

    async uploadImageToFolder(
        imageValue: string | null,
        folder: string,
    ): Promise<string | null> {
        this.assertAllowedFolder(folder);

        if (imageValue === null) {
            return null;
        }

        if (typeof imageValue !== 'string' || !imageValue.trim()) {
            throw new InternalServerErrorException(
                'Image value must be a non-empty string or null',
            );
        }

        const normalizedValue = imageValue.trim();
        if (
            this.isCloudinaryUrl(normalizedValue) &&
            normalizedValue.includes(`/${folder}/`)
        ) {
            return normalizedValue;
        }

        this.ensureConfigured();

        const uploadResult = await cloudinary.uploader.upload(normalizedValue, {
            folder,
            resource_type: 'image',
        });

        return uploadResult.secure_url;
    }

    async uploadBufferToFolder(
        fileBuffer: Buffer,
        folder: string,
        options?: {
            resourceType?: CloudinaryUploadResourceType;
            originalFileName?: string;
        },
    ): Promise<string> {
        this.assertAllowedFolder(folder);
        this.ensureConfigured();

        const resourceType = options?.resourceType ?? 'auto';
        const originalFileName = options?.originalFileName?.trim() || undefined;

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder,
                    resource_type: resourceType,
                    use_filename: Boolean(originalFileName),
                    unique_filename: true,
                    filename_override: originalFileName,
                },
                (error, result) => {
                    const fileUrl = result?.secure_url ?? result?.url ?? null;
                    if (error || !fileUrl) {
                        reject(
                            new InternalServerErrorException(
                                `Cloudinary upload failed: ${error?.message ?? 'Unknown error'}`,
                            ),
                        );
                        return;
                    }

                    resolve(fileUrl);
                },
            );

            uploadStream.end(fileBuffer);
        });
    }

    private extractAssetFromUrl(imageUrl: string): {
        publicIdCandidates: string[];
        resourceType: CloudinaryDeleteResourceType;
    } | null {
        const normalizedUrl = imageUrl.trim();
        if (!this.isCloudinaryUrl(normalizedUrl)) {
            return null;
        }

        const match = normalizedUrl.match(
            /\/(image|video|raw)\/upload\/(?:v\d+\/)?([^?]+)$/i,
        );

        if (!match?.[1] || !match?.[2]) {
            return null;
        }

        const resourceType = match[1].toLowerCase() as CloudinaryDeleteResourceType;
        const publicIdWithExtension = decodeURIComponent(match[2]);
        const publicIdWithoutExtension = publicIdWithExtension.replace(
            /\.[a-zA-Z0-9]+$/,
            '',
        );

        const publicIdCandidates =
            resourceType === 'raw'
                ? [publicIdWithExtension, publicIdWithoutExtension]
                : [publicIdWithoutExtension, publicIdWithExtension];

        return {
            publicIdCandidates,
            resourceType,
        };
    }

    getCloudPublicIdFromUrl(imageUrl: string | null | undefined) {
        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
            return null;
        }

        const asset = this.extractAssetFromUrl(imageUrl);
        return asset?.publicIdCandidates?.[0] ?? null;
    }

    getCloudResourceTypeFromUrl(imageUrl: string | null | undefined) {
        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
            return null;
        }

        const asset = this.extractAssetFromUrl(imageUrl);
        return asset?.resourceType ?? null;
    }

    buildSignedResourceUrl(
        publicId: string,
        options?: {
            resourceType?: CloudinarySignResourceType;
            expiresInSeconds?: number;
        },
    ) {
        if (!publicId?.trim()) {
            throw new InternalServerErrorException('publicId is required');
        }

        this.ensureConfigured();

        const expiresInSeconds = Math.max(
            30,
            Math.min(60 * 60, options?.expiresInSeconds ?? 15 * 60),
        );
        const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

        const url = cloudinary.url(publicId, {
            secure: true,
            sign_url: true,
            expires_at: expiresAt,
            resource_type: options?.resourceType ?? 'raw',
            type: 'upload',
        });

        return {
            url,
            expires_at: expiresAt,
        };
    }

    buildSignedUrlFromAssetUrl(
        assetUrl: string,
        options?: {
            expiresInSeconds?: number;
        },
    ) {
        const publicId = this.getCloudPublicIdFromUrl(assetUrl);
        const resourceType = this.getCloudResourceTypeFromUrl(assetUrl);
        if (!publicId || !resourceType) {
            return null;
        }

        return this.buildSignedResourceUrl(publicId, {
            resourceType,
            expiresInSeconds: options?.expiresInSeconds,
        });
    }

    async deleteImageByUrl(imageUrl: string | null | undefined) {
        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.trim()) {
            return false;
        }

        const asset = this.extractAssetFromUrl(imageUrl);
        if (!asset) {
            return false;
        }

        this.ensureConfigured();

        for (const candidate of asset.publicIdCandidates) {
            const trimmedCandidate = candidate.trim();
            if (!trimmedCandidate) {
                continue;
            }

            const result = await cloudinary.uploader.destroy(trimmedCandidate, {
                resource_type: asset.resourceType,
            });

            if (result.result === 'ok') {
                return true;
            }
        }

        return false;
    }
}
