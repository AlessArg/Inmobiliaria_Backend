import {
    Body,
    Controller,
    Get,
    Headers,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { EmailPasswordLoginDto } from './dto/email-password-login.dto';
import { GoogleLoginDto } from './dto/google-login.dto';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { AuthService } from './auth.service';

// Este controlador maneja autenticación contra Firebase para frontend externo.
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // Este endpoint valida email/password usando Firebase Authentication.
    @Post('login/email')
    loginWithEmailPassword(@Body() body: EmailPasswordLoginDto) {
        return this.authService.loginWithEmailPassword(body.email, body.password);
    }

    // Este endpoint valida login social de Google usando tokens del cliente.
    @Post('login/google')
    loginWithGoogle(@Body() body: GoogleLoginDto) {
        return this.authService.loginWithGoogle(
            body.googleIdToken,
            body.googleAccessToken,
        );
    }

    // Este endpoint valida explícitamente un Firebase ID token.
    @Post('verify-token')
    async verifyToken(@Body() body: VerifyTokenDto) {
        const decodedToken = await this.authService.verifyIdToken(body.idToken);

        return {
            valid: true,
            decodedToken,
        };
    }

    // Este endpoint devuelve sesión actual leyendo Authorization Bearer token.
    @Get('me')
    async getMySession(@Headers('authorization') authorization?: string) {
        if (!authorization?.startsWith('Bearer ')) {
            throw new UnauthorizedException(
                'Missing Bearer token in Authorization header',
            );
        }

        const idToken = authorization.slice('Bearer '.length).trim();
        if (!idToken) {
            throw new UnauthorizedException('Invalid Bearer token');
        }

        const decodedToken = await this.authService.verifyIdToken(idToken);

        return {
            valid: true,
            decodedToken,
        };
    }
}
