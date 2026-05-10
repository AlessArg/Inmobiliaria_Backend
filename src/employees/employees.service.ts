import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    OnModuleInit,
    UnauthorizedException,
} from '@nestjs/common';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ConfigService } from '@nestjs/config';
import {
    createCipheriv,
    createDecipheriv,
    createHash,
    randomBytes,
} from 'crypto';
import { type RowDataPacket } from 'mysql2/promise';
import { MySqlService } from '../database/mysql.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateMarcajeDto } from './dto/create-marcaje.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateRoleViewDto } from './dto/create-role-view.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateRoleViewDto } from './dto/update-role-view.dto';

// Este tipo representa una fila de la tabla employees con los campos solicitados.
type EmployeeRow = RowDataPacket & {
    id_employee?: number;
    employee_name: string;
    employee_age: number;
    employee_job: string;
    employee_salary: number;
    employee_check_in: string;
    employee_photo: string | null;
    employee_user: string;
    employee_password: string;
    employee_email: string;
    activo: boolean;
    id_role: number;
    role_name?: string;
};

// Este tipo representa el payload para crear empleados.
export type CreateEmployeePayload = {
    employee_name: string;
    employee_age: number;
    employee_job: string;
    employee_salary?: number;
    employe_salary?: number;
    employee_check_in: string;
    employee_photo?: string | null;
    employee_user: string;
    employee_password: string;
    employee_email: string;
    id_role: number;
};

type NormalizedCreateEmployeePayload = Omit<
    CreateEmployeeDto,
    'employee_salary' | 'employe_salary'
> & {
    employee_salary: number;
};

// Este tipo representa el payload para actualizar empleados (todos campos opcionales).
export type UpdateEmployeePayload = Partial<{
    employee_name: string;
    employee_age: number;
    employee_job: string;
    employee_salary: number;
    employee_check_in: string;
    employee_photo: string | null;
    employee_user: string;
    employee_email: string;
    activo: boolean;
    id_role: number;
}>;

// Este servicio encapsula la lógica MySQL de employees, cifrado y login.
@Injectable()
export class EmployeesService implements OnModuleInit {
    private readonly logger = new Logger(EmployeesService.name);

    constructor(
        private readonly mySqlService: MySqlService,
        private readonly configService: ConfigService,
        private readonly cloudinaryService: CloudinaryService,
    ) {}

    // Este método obtiene variables obligatorias de .env para evitar secretos hardcodeados.
    private getRequiredEnv(key: string) {
        const value = this.configService.get<string>(key);
        if (!value) {
            throw new InternalServerErrorException(
                `${key} is required in .env`,
            );
        }

        return value;
    }

    // Este método intenta crear el usuario inicial al arrancar la app si no existe.
    async onModuleInit() {
        try {
            await this.ensureDefaultEmployeeExists();
        } catch (error) {
            this.logger.warn(
                `Default employee seed skipped: ${(error as Error).message}`,
            );
        }
    }

    // Este método valida el formato TIME para employee_check_in.
    private normalizeTime(value: string) {
        const timeRegex = /^(\d{1,2}):([0-5]\d):([0-5]\d)$/;
        const match = value.match(timeRegex);
        if (!match) {
            throw new BadRequestException(
                'employee_check_in must use TIME format HH:mm:ss',
            );
        }

        const hour = Number(match[1]);
        if (hour < 0 || hour > 23) {
            throw new BadRequestException(
                'employee_check_in hour must be between 00 and 23',
            );
        }

        const normalizedHour = String(hour).padStart(2, '0');
        return `${normalizedHour}:${match[2]}:${match[3]}`;
    }

    // Este método normaliza aliases y valores opcionales del payload entrante.
    private normalizeCreatePayload(payload: CreateEmployeeDto): NormalizedCreateEmployeePayload {
        if (!payload || typeof payload !== 'object') {
            throw new BadRequestException(
                'Request body must be a valid JSON object',
            );
        }

        const salaryFromAlias = payload.employee_salary;
        const salaryFromOriginalField = payload.employe_salary;

        return {
            ...payload,
            employee_salary:
                salaryFromAlias ?? salaryFromOriginalField ?? Number.NaN,
            employee_check_in: this.normalizeTime(payload.employee_check_in),
            employee_photo:
                payload.employee_photo === '' ||
                payload.employee_photo === undefined
                    ? null
                    : payload.employee_photo,
        };
    }

    // Este método obtiene la llave secreta para cifrar/descifrar contraseñas.
    private getPasswordSecret() {
        const secret = this.configService.get<string>(
            'EMPLOYEE_PASSWORD_SECRET',
        );
        if (!secret) {
            throw new InternalServerErrorException(
                'EMPLOYEE_PASSWORD_SECRET is missing in .env',
            );
        }

        return secret;
    }

    // Este método cifra la contraseña con AES-256-CBC para almacenarla segura en MySQL.
    encryptPassword(plainPassword: string) {
        const secret = this.getPasswordSecret();
        const key = createHash('sha256').update(secret).digest();
        const iv = randomBytes(16);

        const cipher = createCipheriv('aes-256-cbc', key, iv);
        const encrypted = Buffer.concat([
            cipher.update(plainPassword, 'utf8'),
            cipher.final(),
        ]);

        return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    }

    // Este método descifra la contraseña almacenada para validar el login.
    decryptPassword(encryptedPassword: string) {
        const [ivHex, cipherHex] = encryptedPassword.split(':');
        if (!ivHex || !cipherHex) {
            throw new UnauthorizedException(
                'Stored password format is invalid',
            );
        }

        const secret = this.getPasswordSecret();
        const key = createHash('sha256').update(secret).digest();
        const iv = Buffer.from(ivHex, 'hex');

        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([
            decipher.update(Buffer.from(cipherHex, 'hex')),
            decipher.final(),
        ]);

        return decrypted.toString('utf8');
    }

    // Este método valida campos obligatorios del create employee.
    private validateCreatePayload(payload: NormalizedCreateEmployeePayload) {
        if (!payload.employee_name?.trim()) {
            throw new BadRequestException('employee_name is required');
        }

        if (
            !Number.isInteger(payload.employee_age) ||
            payload.employee_age <= 0
        ) {
            throw new BadRequestException(
                'employee_age must be a positive integer',
            );
        }

        if (!payload.employee_job?.trim()) {
            throw new BadRequestException('employee_job is required');
        }

        if (
            typeof payload.employee_salary !== 'number' ||
            payload.employee_salary < 0
        ) {
            throw new BadRequestException(
                'employee_salary must be a valid number >= 0',
            );
        }

        if (!payload.employee_user?.trim()) {
            throw new BadRequestException('employee_user is required');
        }

        if (!payload.employee_password?.trim()) {
            throw new BadRequestException('employee_password is required');
        }

        if (!payload.employee_email?.trim()) {
            throw new BadRequestException('employee_email is required');
        }

        if (!Number.isInteger(payload.id_role) || payload.id_role <= 0) {
            throw new BadRequestException('id_role must be a positive integer');
        }
    }

    // Este método crea un registro en employees cifrando employee_password antes de insertar.
    async createEmployee(payload: CreateEmployeeDto) {
        const normalizedPayload = this.normalizeCreatePayload(payload);
        this.validateCreatePayload(normalizedPayload);

        const employeePhotoForUpload = normalizedPayload.employee_photo ?? null;

        const uploadedEmployeePhoto =
            employeePhotoForUpload === null
                ? null
                : await this.cloudinaryService.uploadImageToFolder(
                      employeePhotoForUpload,
                      'user_photos',
                  );

        const encryptedPassword = this.encryptPassword(
            normalizedPayload.employee_password,
        );

        const insertResult = await this.mySqlService.execute(
            `
      INSERT INTO employees (
        employee_name,
        employee_age,
        employee_job,
        employee_salary,
        employee_check_in,
        employee_photo,
        employee_user,
        employee_password,
        employee_email,
        id_role
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
            [
                normalizedPayload.employee_name,
                normalizedPayload.employee_age,
                normalizedPayload.employee_job,
                normalizedPayload.employee_salary,
                normalizedPayload.employee_check_in,
                uploadedEmployeePhoto ?? null,
                normalizedPayload.employee_user,
                encryptedPassword,
                normalizedPayload.employee_email,
                normalizedPayload.id_role,
            ],
        );

        return {
            id_employee: insertResult.insertId,
            employee_name: normalizedPayload.employee_name,
            employee_age: normalizedPayload.employee_age,
            employee_job: normalizedPayload.employee_job,
            employee_salary: normalizedPayload.employee_salary,
            employee_check_in: normalizedPayload.employee_check_in,
            employee_photo: uploadedEmployeePhoto ?? null,
            employee_user: normalizedPayload.employee_user,
            employee_email: normalizedPayload.employee_email,
            id_role: normalizedPayload.id_role,
            message: 'Employee created successfully',
        };
    }

    // Este método busca un usuario por employee_user para login.
    private async findByUser(employeeUser: string) {
        const rows = await this.mySqlService.queryRows<EmployeeRow>(
            `
      SELECT
        employees.id_employee,
        employees.employee_name,
        employees.employee_age,
        employees.employee_job,
        employees.employee_salary,
        employees.employee_check_in,
        employees.employee_photo,
        employees.employee_user,
        employees.employee_password,
        employees.employee_email,
        employees.activo,
        employees.id_role,
        roles.role_name
      FROM employees
      LEFT JOIN roles ON employees.id_role = roles.id_role
      WHERE employees.employee_user = ?
      LIMIT 1
      `,
            [employeeUser],
        );

        return rows[0] ?? null;
    }

    // Este método busca un empleado por id_employee.
    private async findById(id: number): Promise<EmployeeRow | null> {
        const rows = await this.mySqlService.queryRows<EmployeeRow>(
            `
      SELECT
        employees.id_employee,
        employees.employee_name,
        employees.employee_age,
        employees.employee_job,
        employees.employee_salary,
        employees.employee_check_in,
        employees.employee_photo,
        employees.employee_user,
        employees.employee_password,
        employees.employee_email,
        employees.activo,
        employees.id_role,
        roles.role_name
      FROM employees
      LEFT JOIN roles ON employees.id_role = roles.id_role
      WHERE employees.id_employee = ?
      LIMIT 1
      `,
            [id],
        );

        return rows[0] ?? null;
    }

    // Este método valida usuario y contraseña; responde 200 cuando coincide, 401 cuando no coincide y 403 cuando el empleado está inactivo.
    async loginWithEmployeeUser(employeeUser: string, plainPassword: string) {
        const employee = await this.findByUser(employeeUser);
        if (!employee) {
            throw new UnauthorizedException('User or password is incorrect');
        }

        const decryptedPassword = this.decryptPassword(
            employee.employee_password,
        );
        if (decryptedPassword !== plainPassword) {
            throw new UnauthorizedException('User or password is incorrect');
        }

        if (!employee.activo) {
            throw new ForbiddenException('Employee account is inactive');
        }

        return {
            statusCode: 200,
            message: 'Login successful',
            employee: {
                id_employee: employee.id_employee,
                employee_name: employee.employee_name,
                employee_age: employee.employee_age,
                employee_job: employee.employee_job,
                employee_salary: employee.employee_salary,
                employee_check_in: employee.employee_check_in,
                employee_photo: employee.employee_photo,
                employee_user: employee.employee_user,
                employee_email: employee.employee_email,
                activo: employee.activo,
                role_name: employee.role_name,
            },
        };
    }

    // Este método crea el usuario solicitado por defecto, solo si aún no existe en la tabla.
    async ensureDefaultEmployeeExists() {
        const seedUser = this.configService.get<string>(
            'DEFAULT_EMPLOYEE_USER',
        );
        if (!seedUser) {
            this.logger.log(
                'DEFAULT_EMPLOYEE_USER is not configured; skipping automatic seed',
            );
            return;
        }

        const existingEmployee = await this.findByUser(seedUser);
        if (existingEmployee) {
            return;
        }

        const seedEmployeeName = this.getRequiredEnv('DEFAULT_EMPLOYEE_NAME');
        const seedEmployeeAge = Number(
            this.getRequiredEnv('DEFAULT_EMPLOYEE_AGE'),
        );
        const seedEmployeeJob = this.getRequiredEnv('DEFAULT_EMPLOYEE_JOB');
        const seedEmployeeSalary = Number(
            this.getRequiredEnv('DEFAULT_EMPLOYEE_SALARY'),
        );
        const seedEmployeeCheckIn = this.getRequiredEnv(
            'DEFAULT_EMPLOYEE_CHECK_IN',
        );
        const seedEmployeePassword = this.getRequiredEnv(
            'DEFAULT_EMPLOYEE_PASSWORD',
        );
        const seedEmployeeEmail = this.getRequiredEnv('DEFAULT_EMPLOYEE_EMAIL');
        const seedEmployeeRoleId = Number(
            this.getRequiredEnv('DEFAULT_EMPLOYEE_ROLE_ID'),
        );
        const seedEmployeePhoto =
            this.configService.get<string>('DEFAULT_EMPLOYEE_PHOTO') || null;

        if (!Number.isInteger(seedEmployeeAge) || seedEmployeeAge <= 0) {
            throw new InternalServerErrorException(
                'DEFAULT_EMPLOYEE_AGE must be a positive integer',
            );
        }

        if (Number.isNaN(seedEmployeeSalary) || seedEmployeeSalary < 0) {
            throw new InternalServerErrorException(
                'DEFAULT_EMPLOYEE_SALARY must be a valid number >= 0',
            );
        }

        if (!Number.isInteger(seedEmployeeRoleId) || seedEmployeeRoleId <= 0) {
            throw new InternalServerErrorException(
                'DEFAULT_EMPLOYEE_ROLE_ID must be a positive integer',
            );
        }

        await this.createEmployee({
            employee_name: seedEmployeeName,
            employee_age: seedEmployeeAge,
            employee_job: seedEmployeeJob,
            employee_salary: seedEmployeeSalary,
            employee_check_in: seedEmployeeCheckIn,
            employee_photo: seedEmployeePhoto,
            employee_user: seedUser,
            employee_password: seedEmployeePassword,
            employee_email: seedEmployeeEmail,
            id_role: seedEmployeeRoleId,
        });

        this.logger.log(`Default employee ${seedUser} created successfully`);
    }

    // Este método devuelve todos los empleados sin incluir contraseñas por seguridad.
    async getAllEmployees() {
        const rows = await this.mySqlService.queryRows<EmployeeRow>(
            `
      SELECT
        employees.id_employee,
        employees.employee_name,
        employees.employee_age,
        employees.employee_job,
        employees.employee_salary,
        employees.employee_check_in,
        employees.employee_photo,
        employees.employee_user,
        employees.employee_email,
        employees.activo,
        employees.id_role,
        roles.role_name
      FROM employees
      LEFT JOIN roles ON employees.id_role = roles.id_role
      `,
            [],
        );

        return rows.map((row) => ({
            id_employee: row.id_employee,
            employee_name: row.employee_name,
            employee_age: row.employee_age,
            employee_job: row.employee_job,
            employee_salary: row.employee_salary,
            employee_check_in: row.employee_check_in,
            employee_photo: row.employee_photo,
            employee_user: row.employee_user,
            employee_email: row.employee_email,
            activo: row.activo,
            role_name: row.role_name,
        }));
    }

    // Este método actualiza un empleado por id_employee con campos opcionales, permitiendo actualizar empleados inactivos.
    async updateEmployee(id: number, payload: UpdateEmployeeDto) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestException(
                'id_employee must be a positive integer',
            );
        }

        const existingEmployee = await this.findById(id);
        if (!existingEmployee) {
            throw new NotFoundException(
                `Employee with id_employee ${id} not found`,
            );
        }

        // Normalizar y validar campos si se proporcionan
        const normalizedPayload: Partial<EmployeeRow> = {};
        let uploadedEmployeePhoto: string | null | undefined;

        if (payload.employee_name !== undefined) {
            if (!payload.employee_name?.trim()) {
                throw new BadRequestException('employee_name cannot be empty');
            }
            normalizedPayload.employee_name = payload.employee_name;
        }

        if (payload.employee_age !== undefined) {
            if (
                !Number.isInteger(payload.employee_age) ||
                payload.employee_age <= 0
            ) {
                throw new BadRequestException(
                    'employee_age must be a positive integer',
                );
            }
            normalizedPayload.employee_age = payload.employee_age;
        }

        if (payload.employee_job !== undefined) {
            if (!payload.employee_job?.trim()) {
                throw new BadRequestException('employee_job cannot be empty');
            }
            normalizedPayload.employee_job = payload.employee_job;
        }

        if (payload.employee_salary !== undefined) {
            if (
                typeof payload.employee_salary !== 'number' ||
                payload.employee_salary < 0
            ) {
                throw new BadRequestException(
                    'employee_salary must be a valid number >= 0',
                );
            }
            normalizedPayload.employee_salary = payload.employee_salary;
        }

        if (payload.employee_check_in !== undefined) {
            normalizedPayload.employee_check_in = this.normalizeTime(
                payload.employee_check_in,
            );
        }

        if (payload.employee_photo !== undefined) {
            const normalizedEmployeePhoto =
                payload.employee_photo === '' ||
                payload.employee_photo === undefined
                    ? null
                    : payload.employee_photo;

            uploadedEmployeePhoto =
                normalizedEmployeePhoto === null
                    ? null
                    : await this.cloudinaryService.uploadImageToFolder(
                          normalizedEmployeePhoto,
                          'user_photos',
                      );

            normalizedPayload.employee_photo = uploadedEmployeePhoto;
        }

        if (payload.employee_user !== undefined) {
            if (!payload.employee_user?.trim()) {
                throw new BadRequestException('employee_user cannot be empty');
            }
            // Verificar unicidad si se cambia
            if (payload.employee_user !== existingEmployee.employee_user) {
                const existingUser = await this.findByUser(
                    payload.employee_user,
                );
                if (existingUser) {
                    throw new BadRequestException(
                        'employee_user already exists',
                    );
                }
            }
            normalizedPayload.employee_user = payload.employee_user;
        }

        if (payload.employee_email !== undefined) {
            if (!payload.employee_email?.trim()) {
                throw new BadRequestException('employee_email cannot be empty');
            }
            normalizedPayload.employee_email = payload.employee_email;
        }

        if (payload.activo !== undefined) {
            if (typeof payload.activo !== 'boolean') {
                throw new BadRequestException('activo must be a boolean value');
            }
            normalizedPayload.activo = payload.activo;
        }

        if (payload.id_role !== undefined) {
            if (!Number.isInteger(payload.id_role) || payload.id_role <= 0) {
                throw new BadRequestException(
                    'id_role must be a positive integer',
                );
            }
            normalizedPayload.id_role = payload.id_role;
        }

        // Si no hay campos para actualizar
        if (Object.keys(normalizedPayload).length === 0) {
            throw new BadRequestException(
                'At least one field must be provided to update',
            );
        }

        // Construir query UPDATE
        const updates: string[] = [];
        const values: any[] = [];
        for (const [key, value] of Object.entries(normalizedPayload)) {
            updates.push(`${key} = ?`);
            values.push(value);
        }
        values.push(id);

        const query = `UPDATE employees SET ${updates.join(', ')} WHERE id_employee = ?`;
        await this.mySqlService.execute(query, values);

        if (
            uploadedEmployeePhoto !== undefined &&
            existingEmployee.employee_photo &&
            existingEmployee.employee_photo !== uploadedEmployeePhoto
        ) {
            await this.cloudinaryService.deleteImageByUrl(
                existingEmployee.employee_photo,
            );
        }

        // Devolver el empleado actualizado
        const updatedEmployee = await this.findById(id);
        if (!updatedEmployee) {
            throw new InternalServerErrorException(
                'Failed to retrieve updated employee',
            );
        }

        return {
            id_employee: updatedEmployee.id_employee,
            employee_name: updatedEmployee.employee_name,
            employee_age: updatedEmployee.employee_age,
            employee_job: updatedEmployee.employee_job,
            employee_salary: updatedEmployee.employee_salary,
            employee_check_in: updatedEmployee.employee_check_in,
            employee_photo: updatedEmployee.employee_photo,
            employee_user: updatedEmployee.employee_user,
            employee_email: updatedEmployee.employee_email,
            activo: updatedEmployee.activo,
            role_name: updatedEmployee.role_name,
            message: 'Employee updated successfully',
        };
    }

    // Este método devuelve todos los roles de la tabla roles.
    async getAllRoles() {
        const rows = await this.mySqlService.queryRows(
            `
      SELECT
        id_role,
        role_name
      FROM roles
      `,
            [],
        );

        return rows;
    }

    // Este método devuelve un role por id.
    async getRoleById(id: number) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestException('id must be a positive integer');
        }

        const rows = await this.mySqlService.queryRows(
            `
      SELECT
        id_role,
        role_name
      FROM roles
      WHERE id_role = ?
      `,
            [id],
        );

        return rows[0] || null;
    }

    // Este método devuelve un empleado específico por id_employee.
    async getEmployeeById(id: number) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestException(
                'id_employee must be a positive integer',
            );
        }

        const employee = await this.findById(id);
        if (!employee) {
            throw new NotFoundException(
                `Employee with id_employee ${id} not found`,
            );
        }

        return {
            id_employee: employee.id_employee,
            employee_name: employee.employee_name,
            employee_age: employee.employee_age,
            employee_job: employee.employee_job,
            employee_salary: employee.employee_salary,
            employee_check_in: employee.employee_check_in,
            employee_photo: employee.employee_photo,
            employee_user: employee.employee_user,
            employee_email: employee.employee_email,
            activo: employee.activo,
            role_name: employee.role_name,
        };
    }

    // Este método devuelve todos los marcajes con el nombre del empleado en lugar de id_employee.
    async getAllMarcajes() {
        const rows = await this.mySqlService.queryRows(
            `
      SELECT
        marcajes.id_marcaje,
        marcajes.id_employee,
        employees.employee_name,
        DATE_FORMAT(marcajes.fecha_hora, '%H:%i:%s %d/%m/%Y') AS fecha_hora,
        marcajes.descripción,
        marcajes.motivo
      FROM marcajes
      LEFT JOIN employees ON marcajes.id_employee = employees.id_employee
      ORDER BY marcajes.fecha_hora DESC
      `,
            [],
        );

        return rows;
    }

    // Este método devuelve los marcajes de un empleado específico.
    async getMarcajesByEmployeeId(id: number) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestException(
                'id_employee must be a positive integer',
            );
        }

        const rows = await this.mySqlService.queryRows(
            `
      SELECT
        marcajes.id_marcaje,
        marcajes.id_employee,
        employees.employee_name,
        DATE_FORMAT(marcajes.fecha_hora, '%H:%i:%s %d/%m/%Y') AS fecha_hora,
        marcajes.descripción,
        marcajes.motivo
      FROM marcajes
      LEFT JOIN employees ON marcajes.id_employee = employees.id_employee
      WHERE marcajes.id_employee = ?
      ORDER BY marcajes.fecha_hora DESC
      `,
            [id],
        );

        return rows;
    }

    // Este método crea un registro en marcajes.
    async createMarcaje(payload: CreateMarcajeDto) {
        // Validar id_employee si se proporciona
        if (payload.id_employee !== undefined) {
            if (
                !Number.isInteger(payload.id_employee) ||
                payload.id_employee <= 0
            ) {
                throw new BadRequestException(
                    'id_employee must be a positive integer',
                );
            }
            // Verificar que el empleado existe
            const employee = await this.findById(payload.id_employee);
            if (!employee) {
                throw new NotFoundException(
                    `Employee with id_employee ${payload.id_employee} not found`,
                );
            }
        }

        const insertResult = await this.mySqlService.execute(
            `
      INSERT INTO marcajes (
        fecha_hora,
        descripción,
        motivo,
        id_employee
      )
      VALUES (CONVERT_TZ(?, '+00:00', '-06:00'), ?, ?, ?)
      `,
            [
                payload.fecha_hora || null,
                payload.descripcion || null,
                payload.motivo || null,
                payload.id_employee || null,
            ],
        );

        return {
            id_marcaje: insertResult.insertId,
            fecha_hora: payload.fecha_hora || null,
            descripcion: payload.descripcion || null,
            motivo: payload.motivo || null,
            id_employee: payload.id_employee || null,
            message: 'Marcaje created successfully',
        };
    }

    // Este método crea un registro en roles_views.
    async createRoleView(payload: CreateRoleViewDto) {
        // Validar id_role_reference
        if (
            !Number.isInteger(payload.id_role_reference) ||
            payload.id_role_reference <= 0
        ) {
            throw new BadRequestException(
                'id_role_reference must be a positive integer',
            );
        }

        // Validar name_view
        if (
            !payload.name_view ||
            typeof payload.name_view !== 'string' ||
            payload.name_view.trim().length === 0
        ) {
            throw new BadRequestException(
                'name_view must be a non-empty string',
            );
        }

        // Validar enabled y edit (deben ser 0 o 1)
        if (payload.enabled !== 0 && payload.enabled !== 1) {
            throw new BadRequestException('enabled must be 0 or 1');
        }
        if (payload.edit !== 0 && payload.edit !== 1) {
            throw new BadRequestException('edit must be 0 or 1');
        }

        // Verificar que el role existe
        const role = await this.getRoleById(payload.id_role_reference);
        if (!role) {
            throw new NotFoundException(
                `Role with id_role ${payload.id_role_reference} not found`,
            );
        }

        const insertResult = await this.mySqlService.execute(
            `
      INSERT INTO roles_views (
        id_role_reference,
        name_view,
        enabled,
        edit
      )
      VALUES (?, ?, ?, ?)
      `,
            [
                payload.id_role_reference,
                payload.name_view.trim(),
                payload.enabled,
                payload.edit,
            ],
        );

        return {
            id_role_views: insertResult.insertId,
            id_role_reference: payload.id_role_reference,
            name_view: payload.name_view.trim(),
            enabled: payload.enabled,
            edit: payload.edit,
            message: 'Role view created successfully',
        };
    }

    // Este método crea un registro en roles.
    async createRole(payload: CreateRoleDto) {
        // Validar role_name
        if (
            !payload.role_name ||
            typeof payload.role_name !== 'string' ||
            payload.role_name.trim().length === 0
        ) {
            throw new BadRequestException(
                'role_name must be a non-empty string',
            );
        }

        const insertResult = await this.mySqlService.execute(
            `
      INSERT INTO roles (
        role_name
      )
      VALUES (?)
      `,
            [payload.role_name.trim()],
        );

        return {
            id_role: insertResult.insertId,
            role_name: payload.role_name.trim(),
            message: 'Role created successfully',
        };
    }

    // Este método actualiza enabled y edit en roles_views basado en id_role_reference y name_view.
    async updateRoleView(payload: UpdateRoleViewDto) {
        // Validar id_role_reference
        if (
            !Number.isInteger(payload.id_role_reference) ||
            payload.id_role_reference <= 0
        ) {
            throw new BadRequestException(
                'id_role_reference must be a positive integer',
            );
        }

        // Validar name_view
        if (
            !payload.name_view ||
            typeof payload.name_view !== 'string' ||
            payload.name_view.trim().length === 0
        ) {
            throw new BadRequestException(
                'name_view must be a non-empty string',
            );
        }

        // Validar enabled y edit (deben ser 0 o 1)
        if (payload.enabled !== 0 && payload.enabled !== 1) {
            throw new BadRequestException('enabled must be 0 or 1');
        }
        if (payload.edit !== 0 && payload.edit !== 1) {
            throw new BadRequestException('edit must be 0 or 1');
        }

        // Verificar que el role existe
        const role = await this.getRoleById(payload.id_role_reference);
        if (!role) {
            throw new NotFoundException(
                `Role with id_role ${payload.id_role_reference} not found`,
            );
        }

        const updateResult = await this.mySqlService.execute(
            `
      UPDATE roles_views
      SET enabled = ?, edit = ?
      WHERE id_role_reference = ? AND name_view = ?
      `,
            [
                payload.enabled,
                payload.edit,
                payload.id_role_reference,
                payload.name_view.trim(),
            ],
        );

        if (updateResult.affectedRows === 0) {
            throw new NotFoundException(
                `No role view found with id_role_reference ${payload.id_role_reference} and name_view '${payload.name_view}'`,
            );
        }

        return {
            id_role_reference: payload.id_role_reference,
            name_view: payload.name_view.trim(),
            enabled: payload.enabled,
            edit: payload.edit,
            message: 'Role view updated successfully',
        };
    }

    // Este método devuelve todos los role views para un id_role_reference.
    async getRoleViewsByRoleId(id: number) {
        if (!Number.isInteger(id) || id <= 0) {
            throw new BadRequestException('id must be a positive integer');
        }

        // Verificar que el role existe
        const role = await this.getRoleById(id);
        if (!role) {
            throw new NotFoundException(`Role with id_role ${id} not found`);
        }

        const rows = await this.mySqlService.queryRows(
            `
      SELECT
        id_role_views,
        id_role_reference,
        name_view,
        enabled,
        edit
      FROM roles_views
      WHERE id_role_reference = ?
      `,
            [id],
        );

        return rows;
    }

    // Este método devuelve todos los role views.
    async getAllRoleViews() {
        const rows = await this.mySqlService.queryRows(
            `
      SELECT
        id_role_views,
        id_role_reference,
        name_view,
        enabled,
        edit
      FROM roles_views
      `,
            [],
        );

        return rows;
    }
}
