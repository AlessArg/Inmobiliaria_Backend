import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    OnModuleDestroy,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    createConnection,
    createPool,
    type PoolConnection,
    type Pool,
    type PoolOptions,
    type ResultSetHeader,
    type RowDataPacket,
} from 'mysql2/promise';

// Este tipo representa parámetros válidos para consultas MySQL con mysql2.
type MySqlParam = string | number | boolean | Date | Buffer | null;

export type MySqlTransactionConnection = PoolConnection;

// Este servicio gestiona la conexión y consultas a MySQL.
@Injectable()
export class MySqlService implements OnModuleDestroy {
    private pool: Pool | null = null;
    private databaseChecked = false;

    constructor(private readonly configService: ConfigService) {}

    // Este método exige una variable de entorno obligatoria y falla con mensaje claro si falta.
    private getRequiredEnv(key: string) {
        const value = this.configService.get<string>(key);
        if (!value) {
            throw new InternalServerErrorException(
                `${key} is required in .env`,
            );
        }

        return value;
    }

    // Este método obtiene y valida el puerto de MySQL desde .env.
    private getMySqlPort() {
        const rawPort = this.getRequiredEnv('MYSQL_PORT');
        const parsedPort = Number(rawPort);
        if (!Number.isInteger(parsedPort) || parsedPort <= 0) {
            throw new InternalServerErrorException(
                'MYSQL_PORT must be a valid positive integer',
            );
        }

        return parsedPort;
    }

    // Este método arma la configuración de MySQL usando variables del archivo .env.
    private getPoolConfig(): PoolOptions {
        return {
            host: this.getRequiredEnv('MYSQL_HOST'),
            port: this.getMySqlPort(),
            user: this.getRequiredEnv('MYSQL_USER'),
            password: this.getRequiredEnv('MYSQL_PASSWORD'),
            database: this.getRequiredEnv('MYSQL_DATABASE'),
            ssl: {
                rejectUnauthorized: false,
            },
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        };
    }

    // Este método valida y crea la base indicada en MYSQL_DATABASE si aún no existe.
    private async ensureDatabaseExists() {
        if (this.databaseChecked) {
            return;
        }

        const host = this.getRequiredEnv('MYSQL_HOST');
        const port = this.getMySqlPort();
        const user = this.getRequiredEnv('MYSQL_USER');
        const password = this.getRequiredEnv('MYSQL_PASSWORD');
        const database = this.getRequiredEnv('MYSQL_DATABASE');

        if (!/^[a-zA-Z0-9_]+$/.test(database)) {
            throw new InternalServerErrorException(
                'MYSQL_DATABASE contains invalid characters',
            );
        }

        try {
            const connection = await createConnection({
                host,
                port,
                user,
                password,
            });

            await connection.query(
                `CREATE DATABASE IF NOT EXISTS \`${database}\``,
            );
            await connection.end();
            this.databaseChecked = true;
        } catch (error) {
            this.handleMySqlError(error, 'query');
        }
    }

    // Este método crea el pool solo cuando se usa por primera vez.
    private async getPool(): Promise<Pool> {
        if (!this.pool) {
            await this.ensureDatabaseExists();
            this.pool = createPool(this.getPoolConfig());
        }

        return this.pool;
    }

    // Este método ejecuta un SELECT y retorna filas tipadas.
    async queryRows<T extends RowDataPacket>(
        sql: string,
        params: MySqlParam[] = [],
    ) {
        try {
            const pool = await this.getPool();
            const [rows] = await pool.query<T[]>(sql, params);
            return rows;
        } catch (error) {
            this.handleMySqlError(error, 'query');
        }
    }

    // Este método ejecuta INSERT/UPDATE/DELETE y retorna metadata de ejecución.
    async execute(sql: string, params: MySqlParam[] = []) {
        try {
            const pool = await this.getPool();
            const [result] = await pool.execute<ResultSetHeader>(sql, params);
            return result;
        } catch (error) {
            this.handleMySqlError(error, 'execute');
        }
    }

    // Este método ejecuta un SELECT usando una conexión transaccional existente.
    async queryRowsInTx<T extends RowDataPacket>(
        connection: MySqlTransactionConnection,
        sql: string,
        params: MySqlParam[] = [],
    ) {
        try {
            const [rows] = await connection.query<T[]>(sql, params);
            return rows;
        } catch (error) {
            this.handleMySqlError(error, 'query');
        }
    }

    // Este método ejecuta INSERT/UPDATE/DELETE dentro de una transacción existente.
    async executeInTx(
        connection: MySqlTransactionConnection,
        sql: string,
        params: MySqlParam[] = [],
    ) {
        try {
            const [result] = await connection.execute<ResultSetHeader>(sql, params);
            return result;
        } catch (error) {
            this.handleMySqlError(error, 'execute');
        }
    }

    // Este método abre una transacción, ejecuta el callback y hace commit o rollback automáticamente.
    async withTransaction<T>(
        callback: (connection: MySqlTransactionConnection) => Promise<T>,
    ): Promise<T> {
        const pool = await this.getPool();
        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();
            const result = await callback(connection);
            await connection.commit();
            return result;
        } catch (error) {
            await connection.rollback();

            if (error instanceof HttpException) {
                throw error;
            }

            this.handleMySqlError(error, 'execute');
        } finally {
            connection.release();
        }
    }

    // Este método traduce errores técnicos de MySQL en mensajes claros para el cliente.
    private handleMySqlError(
        error: unknown,
        operation: 'query' | 'execute',
    ): never {
        const mysqlError = error as { code?: string; message?: string };

        if (mysqlError.code === 'ER_BAD_DB_ERROR') {
            throw new ServiceUnavailableException(
                'MySQL database does not exist. Create database configured in MYSQL_DATABASE.',
            );
        }

        if (mysqlError.code === 'ECONNREFUSED') {
            throw new ServiceUnavailableException(
                'MySQL server is unreachable. Verify host, port and service status.',
            );
        }

        throw new InternalServerErrorException(
            `MySQL ${operation} error: ${mysqlError.message ?? 'Unknown error'}`,
        );
    }

    // Este método cierra el pool cuando se apaga la aplicación.
    async onModuleDestroy() {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }
}
