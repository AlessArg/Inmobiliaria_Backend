import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AccountingModule } from './accounting/accounting.module';
import { AuthModule } from './auth/auth.module';
import { BanksModule } from './banks/banks.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ConstructionStylesModule } from './construction-styles/construction-styles.module';
import { DatabaseModule } from './database/database.module';
import { DocumentsTypeModule } from './documents-type/documents-type.module';
import { EmployeesModule } from './employees/employees.module';
import { FirebaseAdminModule } from './firebase/firebase-admin.module';
import { HousesModule } from './houses/houses.module';
import { HealthModule } from './health/health.module';
import { LeadPhaseHistoryModule } from './lead-phase-history/lead-phase-history.module';
import { LeadDocumentsModule } from './lead-documents/lead-documents.module';
import { LeadDocumentationMessagesModule } from './lead-documentation-messages/lead-documentation-messages.module';
import { LeadNotesModule } from './lead-notes/lead-notes.module';
import { LeadsModule } from './leads/leads.module';
import { LocationsModule } from './locations/locations.module';
import { ProjectsModule } from './projects/projects.module';
import { RejectionReasonsHistoryModule } from './rejection-reasons-history/rejection-reasons-history.module';
import { RejectionReasonsModule } from './rejection-reasons/rejection-reasons.module';
import { TeamsModule } from './teams/teams.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { ViewingsModule } from './viewings/viewings.module';
import { validateEnv } from './config/env.validation';

// Este módulo principal carga configuración, Firebase, MySQL y módulos de negocio.
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
        AccountingModule,
        FirebaseAdminModule,
        CloudinaryModule,
        DatabaseModule,
        CatalogsModule,
        DocumentsTypeModule,
        BanksModule,
        AuthModule,
        ConstructionStylesModule,
        UsersModule,
        EmployeesModule,
        LocationsModule,
        ProjectsModule,
        HousesModule,
        LeadsModule,
        LeadPhaseHistoryModule,
        LeadDocumentsModule,
        LeadDocumentationMessagesModule,
        LeadNotesModule,
        RejectionReasonsModule,
        RejectionReasonsHistoryModule,
        TeamsModule,
        ViewingsModule,
        UploadsModule,
        HealthModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
