import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImageToPdfModule } from './modules/image-to-pdf/image-to-pdf.module';
import { PdfCompressionModule } from './modules/pdf-compression/pdf-compression.module';
import { PdfMergeSplitModule } from './modules/pdf-merge-split/pdf-merge-split.module';
import { WordToPdfModule } from './modules/word-to-pdf/word-to-pdf.module';
import { PdfToWordModule } from './modules/pdf-to-word/pdf-to-word.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { PdfEditorModule } from './modules/pdf-editor/pdf-editor.module';
import { TestController } from './modules/common/test.controller';
import { ESignatureModule } from './modules/e-signature/e-signature.module';
import { AuthModule } from './modules/auth/auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { databaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    databaseConfig,
    ImageToPdfModule,
    PdfCompressionModule,
    PdfMergeSplitModule,
    WordToPdfModule,
    PdfToWordModule,
    OcrModule,
    PdfEditorModule,
    ESignatureModule,
    AuthModule,
    AnalyticsModule,
    DashboardModule,
  ],
  controllers: [AppController, TestController],
  providers: [AppService],
})
export class AppModule {}
