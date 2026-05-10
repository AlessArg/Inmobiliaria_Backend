import {
    BadRequestException,
    Body,
    Controller,
    Get,
    ParseIntPipe,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateMarcajeDto } from './dto/create-marcaje.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { CreateRoleViewDto } from './dto/create-role-view.dto';
import { EmployeeLoginDto } from './dto/employee-login.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateRoleViewDto } from './dto/update-role-view.dto';
import { EmployeesService } from './employees.service';

// Este controlador expone API REST para crear empleados y autenticarlos.
@Controller('employees')
export class EmployeesController {
    constructor(private readonly employeesService: EmployeesService) {}

    // ── Rutas estáticas POST ──────────────────────────────────────────────────

    @Post()
    createEmployee(@Body() payload: CreateEmployeeDto) {
        return this.employeesService.createEmployee(payload);
    }

    @UseGuards(ApiKeyGuard)
    @Post('login')
    loginEmployee(@Body() payload: EmployeeLoginDto) {
        const employeeUser = payload.user ?? payload.employee_user;
        const employeePassword = payload.password ?? payload.employee_password;

        if (!employeeUser || !employeePassword) {
            throw new BadRequestException(
                'user/password or employee_user/employee_password are required',
            );
        }

        return this.employeesService.loginWithEmployeeUser(
            employeeUser,
            employeePassword,
        );
    }

    @Post('seed')
    async seedDefaultEmployee() {
        await this.employeesService.ensureDefaultEmployeeExists();
        return {
            message: 'Default employee seed attempted. Check logs for details.',
        };
    }

    @UseGuards(ApiKeyGuard)
    @Post('marcajes')
    createMarcaje(@Body() payload: CreateMarcajeDto) {
        return this.employeesService.createMarcaje(payload);
    }

    @UseGuards(ApiKeyGuard)
    @Post('roles-views')
    createRoleView(@Body() payload: CreateRoleViewDto) {
        return this.employeesService.createRoleView(payload);
    }

    @UseGuards(ApiKeyGuard)
    @Patch('roles-views')
    updateRoleView(@Body() payload: UpdateRoleViewDto) {
        return this.employeesService.updateRoleView(payload);
    }

    @UseGuards(ApiKeyGuard)
    @Post('roles')
    createRole(@Body() payload: CreateRoleDto) {
        return this.employeesService.createRole(payload);
    }

    // ── Rutas estáticas GET ─────

    @UseGuards(ApiKeyGuard)
    @Get()
    getAllEmployees() {
        return this.employeesService.getAllEmployees();
    }

    @UseGuards(ApiKeyGuard)
    @Get('roles')
    getAllRoles() {
        return this.employeesService.getAllRoles();
    }

    @UseGuards(ApiKeyGuard)
    @Get('roles-views')
    getAllRoleViews() {
        return this.employeesService.getAllRoleViews();
    }

    @UseGuards(ApiKeyGuard)
    @Get('marcajes')
    getAllMarcajes() {
        return this.employeesService.getAllMarcajes();
    }

    // ── Rutas con parámetros dinámicos (siempre al final) ────────────────────

    @UseGuards(ApiKeyGuard)
    @Get('roles-views/:id_role_reference')
    getRoleViewsByRoleId(
        @Param('id_role_reference', ParseIntPipe) idRoleReference: number,
    ) {
        return this.employeesService.getRoleViewsByRoleId(idRoleReference);
    }

    @UseGuards(ApiKeyGuard)
    @Get('marcajes/:id_employee')
    getMarcajesByEmployeeId(@Param('id_employee', ParseIntPipe) idEmployee: number) {
        return this.employeesService.getMarcajesByEmployeeId(idEmployee);
    }

    @UseGuards(ApiKeyGuard)
    @Get(':id_employee')
    getEmployeeById(@Param('id_employee', ParseIntPipe) idEmployee: number) {
        return this.employeesService.getEmployeeById(idEmployee);
    }

    @UseGuards(ApiKeyGuard)
    @Patch(':id_employee')
    updateEmployee(
        @Param('id_employee', ParseIntPipe) idEmployee: number,
        @Body() payload: UpdateEmployeeDto,
    ) {
        return this.employeesService.updateEmployee(idEmployee, payload);
    }
}
