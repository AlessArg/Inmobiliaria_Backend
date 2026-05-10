import { Type } from 'class-transformer';
import {
    IsBoolean,
    IsDateString,
    IsInt,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateLeadDocumentDto {
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_lead: number;

    @IsOptional()
    @IsString()
    @MaxLength(512)
    document_photo?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    document_original_name?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    document_mime_type?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    document_size_bytes?: number;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    cloud_public_id?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_document_type?: number;

    @IsOptional()
    @IsBoolean()
    verified?: boolean;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    id_verified_by?: number;

    @IsOptional()
    @IsDateString()
    verified_at?: string;
}
