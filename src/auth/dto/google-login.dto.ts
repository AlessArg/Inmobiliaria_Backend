import { IsOptional, IsString } from 'class-validator';

export class GoogleLoginDto {
    @IsOptional()
    @IsString()
    googleIdToken?: string;

    @IsOptional()
    @IsString()
    googleAccessToken?: string;
}
