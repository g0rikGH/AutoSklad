import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { DocumentsModule } from './documents/documents.module';
import { PartnersModule } from './partners/partners.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CatalogModule,
    DocumentsModule,
    PartnersModule,
  ],
})
export class AppModule {}
