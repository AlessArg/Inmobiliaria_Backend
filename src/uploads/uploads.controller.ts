import {
    BadRequestException,
    Body,
    Controller,
    Patch,
    Post,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

type UploadImageBody = {
    folder?: string;
};

type UploadedImageFile = {
    buffer: Buffer;
    originalname: string;
    mimetype: string;
    size: number;
};

@Controller('uploads')
@UseGuards(ApiKeyGuard)
export class UploadsController {
    constructor(private readonly cloudinaryService: CloudinaryService) {}

    private isAllowedMimeType(mimeType: string) {
        return mimeType.startsWith('image/') || mimeType === 'application/pdf';
    }

    private async processImageUpload(
        file: UploadedImageFile | undefined,
        body: UploadImageBody,
    ) {
        const folder = body.folder?.trim();
        if (!folder) {
            throw new BadRequestException('folder is required');
        }

        if (!file?.buffer || file.buffer.length === 0) {
            throw new BadRequestException('file is required');
        }

        if (!this.isAllowedMimeType(file.mimetype)) {
            throw new BadRequestException(
                'Only image/* and application/pdf files are allowed',
            );
        }

        const resourceType =
            file.mimetype === 'application/pdf' ? 'raw' : 'image';

        const fileUrl = await this.cloudinaryService.uploadBufferToFolder(
            file.buffer,
            folder,
            {
                resourceType,
                originalFileName: file.originalname,
            },
        );

        return {
            imageUrl: fileUrl,
            fileUrl,
            folder,
            resourceType,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
        };
    }

    @Post('image')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
        }),
    )
    async uploadImage(
        @UploadedFile() file: UploadedImageFile | undefined,
        @Body() body: UploadImageBody,
    ) {
        return this.processImageUpload(file, body);
    }

    @Patch('image')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 10 * 1024 * 1024,
            },
        }),
    )
    async updateImage(
        @UploadedFile() file: UploadedImageFile | undefined,
        @Body() body: UploadImageBody,
    ) {
        return this.processImageUpload(file, body);
    }
}
