import { Module } from '@nestjs/common';
import { ImageToPdfController } from './controller/image-to-pdf.controller';
import { ImageToPdfService } from './service/image-to-pdf.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [ImageToPdfController],
  providers: [ImageToPdfService]
})
export class ImageToPdfModule {}