import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateHouseDto } from './dto/create-house.dto';
import { UpdateHouseDto } from './dto/update-house.dto';

const HOUSE_SELECT_COLUMNS = `
                id_house,
                house_name,
                price,
                house_description,
                house_size,
                house_floors,
                house_bathrooms,
                house_living_rooms,
                house_rooftop,
                house_basement,
                house_bedrooms,
                house_total_rooms,
                house_playrooms,
                house_kitchens,
                house_furnished,
                house_garage,
                house_parking_slots,
                house_frontyard,
                house_backyard,
                house_photo_1,
                house_photo_2,
                house_photo_3,
                house_status,
                id_project
`;

type HouseRow = RowDataPacket & {
    id_house: number;
    house_name: string;
    price: number | null;
    house_description: string | null;
    house_size: number | null;
    house_floors: number;
    house_bathrooms: number;
    house_living_rooms: number;
    house_rooftop: number;
    house_basement: number;
    house_bedrooms: number;
    house_total_rooms: number;
    house_playrooms: number;
    house_kitchens: number;
    house_furnished: number;
    house_garage: number;
    house_parking_slots: number;
    house_frontyard: number;
    house_backyard: number;
    house_photo_1: string;
    house_photo_2: string;
    house_photo_3: string;
    house_status: number;
    id_project: number;
};

@Injectable()
export class HousesService {
    constructor(
        private readonly mySqlService: MySqlService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    private hasOwnProperty(payload: Record<string, unknown>, key: string): boolean {
        return Object.prototype.hasOwnProperty.call(payload, key);
    }

    private parseRequiredNonEmptyString(payload: Record<string, unknown>, key: string): string {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException(`${key} must be a non-empty string`);
        }

        return value.trim();
    }

    private parseOptionalNonEmptyString(payload: Record<string, unknown>, key: string): string | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (typeof value !== 'string' || !value.trim()) {
            throw new BadRequestException(`${key} must be a non-empty string`);
        }

        return value.trim();
    }

    private parseRequiredInteger(payload: Record<string, unknown>, key: string): number {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        if (
            typeof value !== 'number' ||
            !Number.isInteger(value) ||
            !Number.isFinite(value)
        ) {
            throw new BadRequestException(`${key} must be a valid integer`);
        }

        return value;
    }

    private parseOptionalInteger(payload: Record<string, unknown>, key: string): number | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (
            typeof value !== 'number' ||
            !Number.isInteger(value) ||
            !Number.isFinite(value)
        ) {
            throw new BadRequestException(`${key} must be a valid integer`);
        }

        return value;
    }

    private parseOptionalDecimal(payload: Record<string, unknown>, key: string): number | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            throw new BadRequestException(`${key} must be a valid decimal number`);
        }

        if (value < 0) {
            throw new BadRequestException(`${key} must be greater than or equal to 0`);
        }

        const decimalPlaces = value.toString().split('.')[1]?.length ?? 0;
        if (decimalPlaces > 2) {
            throw new BadRequestException(`${key} can have at most 2 decimal places`);
        }

        return value;
    }

    private parseRequiredBooleanOr01(payload: Record<string, unknown>, key: string): number {
        if (!this.hasOwnProperty(payload, key)) {
            throw new BadRequestException(`${key} is required`);
        }

        const value = payload[key];
        return this.normalizeBooleanOr01(value, key);
    }

    private parseOptionalBooleanOr01(payload: Record<string, unknown>, key: string): number | undefined {
        if (!this.hasOwnProperty(payload, key)) {
            return undefined;
        }

        const value = payload[key];
        return this.normalizeBooleanOr01(value, key);
    }

    private normalizeBooleanOr01(value: unknown, key: string): number {
        if (typeof value === 'boolean') {
            return value ? 1 : 0;
        }

        if (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            (value === 0 || value === 1)
        ) {
            return value;
        }

        throw new BadRequestException(`${key} must be boolean or 0/1`);
    }

    private parseCreatePayload(payload: CreateHouseDto) {
        const body = payload as unknown as Record<string, unknown>;

        return {
            house_name: this.parseRequiredNonEmptyString(body, 'house_name'),
            price: this.parseOptionalDecimal(body, 'price'),
            house_description: this.parseOptionalNonEmptyString(
                body,
                'house_description',
            ),
            house_size: this.parseOptionalInteger(body, 'house_size'),
            house_floors: this.parseRequiredInteger(body, 'house_floors'),
            house_bathrooms: this.parseRequiredInteger(body, 'house_bathrooms'),
            house_living_rooms: this.parseRequiredInteger(body, 'house_living_rooms'),
            house_rooftop: this.parseRequiredBooleanOr01(body, 'house_rooftop'),
            house_basement: this.parseRequiredBooleanOr01(body, 'house_basement'),
            house_bedrooms: this.parseRequiredInteger(body, 'house_bedrooms'),
            house_total_rooms: this.parseRequiredInteger(body, 'house_total_rooms'),
            house_playrooms: this.parseRequiredInteger(body, 'house_playrooms'),
            house_kitchens: this.parseRequiredInteger(body, 'house_kitchens'),
            house_furnished: this.parseRequiredBooleanOr01(body, 'house_furnished'),
            house_garage: this.parseRequiredBooleanOr01(body, 'house_garage'),
            house_parking_slots: this.parseRequiredInteger(body, 'house_parking_slots'),
            house_frontyard: this.parseRequiredBooleanOr01(body, 'house_frontyard'),
            house_backyard: this.parseRequiredBooleanOr01(body, 'house_backyard'),
            house_photo_1: this.parseRequiredNonEmptyString(body, 'house_photo_1'),
            house_photo_2: this.parseRequiredNonEmptyString(body, 'house_photo_2'),
            house_photo_3: this.parseRequiredNonEmptyString(body, 'house_photo_3'),
            house_status: this.parseRequiredBooleanOr01(body, 'house_status'),
            id_project: this.parseRequiredInteger(body, 'id_project'),
        };
    }

    private async parseUpdatePayload(payload: UpdateHouseDto) {
        const body = payload as unknown as Record<string, unknown>;
        const updates: string[] = [];
        const params: Array<string | number> = [];
        const uploadedPhotos: {
            house_photo_1?: string;
            house_photo_2?: string;
            house_photo_3?: string;
        } = {};

        const maybeHouseName = this.parseOptionalNonEmptyString(body, 'house_name');
        if (maybeHouseName !== undefined) {
            updates.push('house_name = ?');
            params.push(maybeHouseName);
        }

        const maybePrice = this.parseOptionalDecimal(body, 'price');
        if (maybePrice !== undefined) {
            updates.push('price = ?');
            params.push(maybePrice);
        }

        const maybeHouseDescription = this.parseOptionalNonEmptyString(
            body,
            'house_description',
        );
        if (maybeHouseDescription !== undefined) {
            updates.push('house_description = ?');
            params.push(maybeHouseDescription);
        }

        const maybeHouseSize = this.parseOptionalInteger(body, 'house_size');
        if (maybeHouseSize !== undefined) {
            updates.push('house_size = ?');
            params.push(maybeHouseSize);
        }

        const maybeHouseFloors = this.parseOptionalInteger(body, 'house_floors');
        if (maybeHouseFloors !== undefined) {
            updates.push('house_floors = ?');
            params.push(maybeHouseFloors);
        }

        const maybeHouseBathrooms = this.parseOptionalInteger(body, 'house_bathrooms');
        if (maybeHouseBathrooms !== undefined) {
            updates.push('house_bathrooms = ?');
            params.push(maybeHouseBathrooms);
        }

        const maybeHouseLivingRooms = this.parseOptionalInteger(body, 'house_living_rooms');
        if (maybeHouseLivingRooms !== undefined) {
            updates.push('house_living_rooms = ?');
            params.push(maybeHouseLivingRooms);
        }

        const maybeHouseRooftop = this.parseOptionalBooleanOr01(body, 'house_rooftop');
        if (maybeHouseRooftop !== undefined) {
            updates.push('house_rooftop = ?');
            params.push(maybeHouseRooftop);
        }

        const maybeHouseBasement = this.parseOptionalBooleanOr01(body, 'house_basement');
        if (maybeHouseBasement !== undefined) {
            updates.push('house_basement = ?');
            params.push(maybeHouseBasement);
        }

        const maybeHouseBedrooms = this.parseOptionalInteger(body, 'house_bedrooms');
        if (maybeHouseBedrooms !== undefined) {
            updates.push('house_bedrooms = ?');
            params.push(maybeHouseBedrooms);
        }

        const maybeHouseTotalRooms = this.parseOptionalInteger(body, 'house_total_rooms');
        if (maybeHouseTotalRooms !== undefined) {
            updates.push('house_total_rooms = ?');
            params.push(maybeHouseTotalRooms);
        }

        const maybeHousePlayrooms = this.parseOptionalInteger(body, 'house_playrooms');
        if (maybeHousePlayrooms !== undefined) {
            updates.push('house_playrooms = ?');
            params.push(maybeHousePlayrooms);
        }

        const maybeHouseKitchens = this.parseOptionalInteger(body, 'house_kitchens');
        if (maybeHouseKitchens !== undefined) {
            updates.push('house_kitchens = ?');
            params.push(maybeHouseKitchens);
        }

        const maybeHouseFurnished = this.parseOptionalBooleanOr01(body, 'house_furnished');
        if (maybeHouseFurnished !== undefined) {
            updates.push('house_furnished = ?');
            params.push(maybeHouseFurnished);
        }

        const maybeHouseGarage = this.parseOptionalBooleanOr01(body, 'house_garage');
        if (maybeHouseGarage !== undefined) {
            updates.push('house_garage = ?');
            params.push(maybeHouseGarage);
        }

        const maybeHouseParkingSlots = this.parseOptionalInteger(body, 'house_parking_slots');
        if (maybeHouseParkingSlots !== undefined) {
            updates.push('house_parking_slots = ?');
            params.push(maybeHouseParkingSlots);
        }

        const maybeHouseFrontyard = this.parseOptionalBooleanOr01(body, 'house_frontyard');
        if (maybeHouseFrontyard !== undefined) {
            updates.push('house_frontyard = ?');
            params.push(maybeHouseFrontyard);
        }

        const maybeHouseBackyard = this.parseOptionalBooleanOr01(body, 'house_backyard');
        if (maybeHouseBackyard !== undefined) {
            updates.push('house_backyard = ?');
            params.push(maybeHouseBackyard);
        }

        const maybeHousePhoto1 = this.parseOptionalNonEmptyString(body, 'house_photo_1');
        if (maybeHousePhoto1 !== undefined) {
            const uploadedPhoto1 = await this.cloudinaryService.uploadImageToFolder(
                maybeHousePhoto1,
                'houses_photos',
            );
            updates.push('house_photo_1 = ?');
            const resolvedPhoto = uploadedPhoto1 ?? '';
            params.push(resolvedPhoto);
            uploadedPhotos.house_photo_1 = resolvedPhoto;
        }

        const maybeHousePhoto2 = this.parseOptionalNonEmptyString(body, 'house_photo_2');
        if (maybeHousePhoto2 !== undefined) {
            const uploadedPhoto2 = await this.cloudinaryService.uploadImageToFolder(
                maybeHousePhoto2,
                'houses_photos',
            );
            updates.push('house_photo_2 = ?');
            const resolvedPhoto = uploadedPhoto2 ?? '';
            params.push(resolvedPhoto);
            uploadedPhotos.house_photo_2 = resolvedPhoto;
        }

        const maybeHousePhoto3 = this.parseOptionalNonEmptyString(body, 'house_photo_3');
        if (maybeHousePhoto3 !== undefined) {
            const uploadedPhoto3 = await this.cloudinaryService.uploadImageToFolder(
                maybeHousePhoto3,
                'houses_photos',
            );
            updates.push('house_photo_3 = ?');
            const resolvedPhoto = uploadedPhoto3 ?? '';
            params.push(resolvedPhoto);
            uploadedPhotos.house_photo_3 = resolvedPhoto;
        }

        const maybeHouseStatus = this.parseOptionalBooleanOr01(body, 'house_status');
        if (maybeHouseStatus !== undefined) {
            updates.push('house_status = ?');
            params.push(maybeHouseStatus);
        }

        const maybeProjectId = this.parseOptionalInteger(body, 'id_project');
        if (maybeProjectId !== undefined) {
            updates.push('id_project = ?');
            params.push(maybeProjectId);
        }

        if (updates.length === 0) {
            throw new BadRequestException('At least one field must be provided to update');
        }

        return { updates, params, uploadedPhotos };
    }

    private async ensureProjectExists(idProject: number) {
        const rows = await this.mySqlService.queryRows<RowDataPacket>(
            `
            SELECT id_project
            FROM projects
            WHERE id_project = ?
            LIMIT 1
            `,
            [idProject],
        );

        if (!rows[0]) {
            throw new NotFoundException(
                `Project with id_project ${idProject} was not found`,
            );
        }
    }

    private async getHouseByIdOrFail(idHouse: number) {
        const rows = await this.mySqlService.queryRows<HouseRow>(
            `
            SELECT
${HOUSE_SELECT_COLUMNS}
            FROM houses
            WHERE id_house = ?
            LIMIT 1
            `,
            [idHouse],
        );

        const house = rows[0];
        if (!house) {
            throw new NotFoundException(
                `House with id_house ${idHouse} was not found`,
            );
        }

        return house;
    }

    async getAllHouses() {
        return this.mySqlService.queryRows<HouseRow>(
            `
            SELECT
${HOUSE_SELECT_COLUMNS}
            FROM houses
            ORDER BY id_house DESC
            `,
            [],
        );
    }

    async getHousesByProjectId(idProject: number) {
        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        await this.ensureProjectExists(idProject);

        return this.mySqlService.queryRows<HouseRow>(
            `
            SELECT
${HOUSE_SELECT_COLUMNS}
            FROM houses
            WHERE id_project = ?
            ORDER BY id_house DESC
            `,
            [idProject],
        );
    }

    async getActiveHousesByProjectId(idProject: number) {
        if (!Number.isInteger(idProject) || idProject <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        await this.ensureProjectExists(idProject);

        return this.mySqlService.queryRows<HouseRow>(
            `
            SELECT
${HOUSE_SELECT_COLUMNS}
            FROM houses
            WHERE id_project = ?
              AND house_status = 1
            ORDER BY id_house DESC
            `,
            [idProject],
        );
    }

    async getHouseById(idHouse: number) {
        if (!Number.isInteger(idHouse) || idHouse <= 0) {
            throw new BadRequestException('id_house must be a positive integer');
        }

        return this.getHouseByIdOrFail(idHouse);
    }

    async createHouse(payload: CreateHouseDto) {
        const house = this.parseCreatePayload(payload);

        if (house.id_project <= 0) {
            throw new BadRequestException('id_project must be a positive integer');
        }

        await this.ensureProjectExists(house.id_project);

        const uploadedPhoto1 = await this.cloudinaryService.uploadImageToFolder(
            house.house_photo_1,
            'houses_photos',
        );
        const uploadedPhoto2 = await this.cloudinaryService.uploadImageToFolder(
            house.house_photo_2,
            'houses_photos',
        );
        const uploadedPhoto3 = await this.cloudinaryService.uploadImageToFolder(
            house.house_photo_3,
            'houses_photos',
        );

        const insertResult = await this.mySqlService.execute(
            `
            INSERT INTO houses (
                house_name,
                price,
                house_description,
                house_size,
                house_floors,
                house_bathrooms,
                house_living_rooms,
                house_rooftop,
                house_basement,
                house_bedrooms,
                house_total_rooms,
                house_playrooms,
                house_kitchens,
                house_furnished,
                house_garage,
                house_parking_slots,
                house_frontyard,
                house_backyard,
                house_photo_1,
                house_photo_2,
                house_photo_3,
                house_status,
                id_project
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                house.house_name,
                house.price ?? null,
                house.house_description ?? null,
                house.house_size ?? null,
                house.house_floors,
                house.house_bathrooms,
                house.house_living_rooms,
                house.house_rooftop,
                house.house_basement,
                house.house_bedrooms,
                house.house_total_rooms,
                house.house_playrooms,
                house.house_kitchens,
                house.house_furnished,
                house.house_garage,
                house.house_parking_slots,
                house.house_frontyard,
                house.house_backyard,
                uploadedPhoto1,
                uploadedPhoto2,
                uploadedPhoto3,
                house.house_status,
                house.id_project,
            ],
        );

        return this.getHouseByIdOrFail(insertResult.insertId);
    }

    async createManyHouses(payload: CreateHouseDto[]) {
        if (!Array.isArray(payload) || payload.length === 0) {
            throw new BadRequestException(
                'Request body must be a non-empty array of houses',
            );
        }

        const createdHouses: HouseRow[] = [];

        for (const item of payload) {
            const created = await this.createHouse(item);
            createdHouses.push(created);
        }

        return {
            total: createdHouses.length,
            houses: createdHouses,
        };
    }

    async updateHouse(idHouse: number, payload: UpdateHouseDto) {
        if (!Number.isInteger(idHouse) || idHouse <= 0) {
            throw new BadRequestException('id_house must be a positive integer');
        }

        const existingHouse = await this.getHouseByIdOrFail(idHouse);

        const { updates, params, uploadedPhotos } = await this.parseUpdatePayload(payload);

        const body = payload as unknown as Record<string, unknown>;
        const maybeProjectId = this.parseOptionalInteger(body, 'id_project');
        if (maybeProjectId !== undefined) {
            if (maybeProjectId <= 0) {
                throw new BadRequestException(
                    'id_project must be a positive integer',
                );
            }
            await this.ensureProjectExists(maybeProjectId);
        }

        params.push(idHouse);

        await this.mySqlService.execute(
            `
            UPDATE houses
            SET ${updates.join(', ')}
            WHERE id_house = ?
            `,
            params,
        );

        if (
            uploadedPhotos.house_photo_1 &&
            existingHouse.house_photo_1 &&
            existingHouse.house_photo_1 !== uploadedPhotos.house_photo_1
        ) {
            await this.cloudinaryService.deleteImageByUrl(existingHouse.house_photo_1);
        }

        if (
            uploadedPhotos.house_photo_2 &&
            existingHouse.house_photo_2 &&
            existingHouse.house_photo_2 !== uploadedPhotos.house_photo_2
        ) {
            await this.cloudinaryService.deleteImageByUrl(existingHouse.house_photo_2);
        }

        if (
            uploadedPhotos.house_photo_3 &&
            existingHouse.house_photo_3 &&
            existingHouse.house_photo_3 !== uploadedPhotos.house_photo_3
        ) {
            await this.cloudinaryService.deleteImageByUrl(existingHouse.house_photo_3);
        }

        return this.getHouseByIdOrFail(idHouse);
    }

    async deleteHouse(idHouse: number) {
        if (!Number.isInteger(idHouse) || idHouse <= 0) {
            throw new BadRequestException('id_house must be a positive integer');
        }

        const existingHouse = await this.getHouseByIdOrFail(idHouse);

        await this.mySqlService.execute(
            `
            DELETE FROM houses
            WHERE id_house = ?
            `,
            [idHouse],
        );

        await this.cloudinaryService.deleteImageByUrl(existingHouse.house_photo_1);
        await this.cloudinaryService.deleteImageByUrl(existingHouse.house_photo_2);
        await this.cloudinaryService.deleteImageByUrl(existingHouse.house_photo_3);

        return {
            message: `House ${idHouse} deleted successfully`,
        };
    }
}
