import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateBankDto } from './dto/create-bank.dto';

type BankRow = RowDataPacket & {
    id_bank: number;
    bank_name: string | null;
    bank_interest_rate: number | null;
};

@Injectable()
export class BanksService {
    constructor(private readonly mySqlService: MySqlService) {}

    async getBanks() {
        return this.mySqlService.queryRows<BankRow>(
            `
            SELECT *
            FROM banks
            ORDER BY id_bank ASC
            `,
            [],
        );
    }

    async getBankById(idBank: number) {
        if (!Number.isInteger(idBank) || idBank <= 0) {
            throw new BadRequestException('id_bank must be a positive integer');
        }

        const rows = await this.mySqlService.queryRows<BankRow>(
            `
            SELECT *
            FROM banks
            WHERE id_bank = ?
            LIMIT 1
            `,
            [idBank],
        );

        const bank = rows[0];
        if (!bank) {
            throw new NotFoundException(`Bank with id_bank ${idBank} not found`);
        }

        return bank;
    }

    async createBank(payload: CreateBankDto) {
        const bankName = payload.bank_name?.trim();
        if (!bankName) {
            throw new BadRequestException('bank_name is required');
        }

        const bankInterestRate =
            payload.bank_interest_rate === undefined
                ? null
                : payload.bank_interest_rate;

        if (
            bankInterestRate !== null &&
            (!Number.isInteger(bankInterestRate) ||
                bankInterestRate < 0 ||
                bankInterestRate > 99)
        ) {
            throw new BadRequestException(
                'bank_interest_rate must be an integer between 0 and 99',
            );
        }

        const result = await this.mySqlService.execute(
            `
            INSERT INTO banks (
                bank_name,
                bank_interest_rate
            )
            VALUES (?, ?)
            `,
            [bankName, bankInterestRate],
        );

        return this.getBankById(result.insertId);
    }
}
