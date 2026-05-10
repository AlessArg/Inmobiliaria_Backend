import { Global, Module } from '@nestjs/common';
import { MySqlService } from './mysql.service';

// Este módulo global expone la conexión MySQL para cualquier módulo del backend.
@Global()
@Module({
    providers: [MySqlService],
    exports: [MySqlService],
})
export class DatabaseModule {}
