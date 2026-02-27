import { Module } from '@nestjs/common';
import { PdfEditorController } from './controller/pdf-editor.controller';
import { PdfEditorService } from './service/pdf-editor.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [PdfEditorController],
  providers: [PdfEditorService]
})
export class PdfEditorModule {}