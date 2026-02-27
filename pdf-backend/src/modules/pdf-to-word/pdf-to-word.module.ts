import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PdfToWordController } from './controller';
import { PdfToWordService } from './service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [
    AnalyticsModule,
    HttpModule.register({
      timeout: 120000, // 2-minute timeout for large PDF conversions
      maxRedirects: 3,
    }),
  ],
  controllers: [PdfToWordController],
  providers: [PdfToWordService],
})
export class PdfToWordModule {}
