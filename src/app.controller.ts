import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// Este controlador expone la ruta raíz con información de endpoints disponibles.
@Controller()
export class AppController {
    constructor(private readonly appService: AppService) {}

    // Esta ruta funciona como entrada principal para descubrir el API.
    @Get()
    getHello() {
        return this.appService.getHello();
    }
}
