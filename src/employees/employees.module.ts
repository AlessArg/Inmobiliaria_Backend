import { Module } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { EmployeesController } from './employees.controller.js';
import { EmployeesService } from './employees.service.js';

// Este módulo concentra la lógica de empleados en MySQL.
@Module({
    controllers: [EmployeesController],
    providers: [EmployeesService, ApiKeyGuard],
})
export class EmployeesModule {}
