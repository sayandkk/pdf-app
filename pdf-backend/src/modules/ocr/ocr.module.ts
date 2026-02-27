import { Module } from '@nestjs/common';
import { OcrController } from './controller/ocr.controller';
import { OcrService } from './service/ocr.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [OcrController],
  providers: [OcrService]
})
export class OcrModule {}