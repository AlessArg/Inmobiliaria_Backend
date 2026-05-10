import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateConstructionStyleDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    construction_style_name: string;
}
