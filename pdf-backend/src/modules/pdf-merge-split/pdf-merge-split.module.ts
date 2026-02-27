import { Module } from '@nestjs/common';
import { PdfMergeSplitController } from './controller/pdf-merge-split.controller';
import { PdfMergeSplitService } from './service/pdf-merge-split.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [PdfMergeSplitController],
  providers: [PdfMergeSplitService]
})
export class PdfMergeSplitModule {}