import {
	IsIn,
	IsInt,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsString,
	MaxLength,
	Min,
} from 'class-validator';

export class UpdateHouseDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(20)
	house_name?: string;

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

	@IsOptional()
	@IsInt()
	@Min(0)
	house_floors?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_bathrooms?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_living_rooms?: number;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_rooftop?: boolean | number;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_basement?: boolean | number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_bedrooms?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_total_rooms?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_playrooms?: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_kitchens?: number;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_furnished?: boolean | number;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_garage?: boolean | number;

	@IsOptional()
	@IsInt()
	@Min(0)
	house_parking_slots?: number;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_frontyard?: boolean | number;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_backyard?: boolean | number;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(512)
	house_photo_1?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(512)
	house_photo_2?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	@MaxLength(512)
	house_photo_3?: string;

	@IsOptional()
	@IsIn([0, 1, true, false])
	house_status?: boolean | number;

	@IsOptional()
	@IsInt()
	@Min(1)
	id_project?: number;
}
