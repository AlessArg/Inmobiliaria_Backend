import {
    IsDefined,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateHouseDto {
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    house_name: string;

    @IsOptional()
    @IsNumber({ maxDecimalPlaces: 2 })
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    house_description?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    house_size?: number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_floors: number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_bathrooms: number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_living_rooms: number;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_rooftop: boolean | number;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_basement: boolean | number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_bedrooms: number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_total_rooms: number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_playrooms: number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_kitchens: number;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_furnished: boolean | number;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_garage: boolean | number;

    @IsDefined()
    @IsInt()
    @Min(0)
    house_parking_slots: number;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_frontyard: boolean | number;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_backyard: boolean | number;

    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    house_photo_1: string;

    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    house_photo_2: string;

    @IsDefined()
    @IsString()
    @IsNotEmpty()
    @MaxLength(512)
    house_photo_3: string;

    @IsDefined()
    @IsIn([0, 1, true, false])
    house_status: boolean | number;

    @IsDefined()
    @IsInt()
    @Min(1)
    id_project: number;
}
