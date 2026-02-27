import { Module } from '@nestjs/common';
import { WordToPdfController } from './controller';
import { WordToPdfService } from './service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [WordToPdfController],
  providers: [WordToPdfService]
})
export class WordToPdfModule {}
