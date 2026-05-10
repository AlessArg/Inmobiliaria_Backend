import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class EmailPasswordLoginDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    password: string;
}
