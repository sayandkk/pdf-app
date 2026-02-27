import { Module } from '@nestjs/common';
import { PdfCompressionController } from './controller/pdf-compression.controller';
import { PdfCompressionService } from './service/pdf-compression.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [PdfCompressionController],
  providers: [PdfCompressionService],
})
export class PdfCompressionModule { }