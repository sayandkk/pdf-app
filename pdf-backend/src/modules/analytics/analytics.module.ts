import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './controller/analytics.controller';
import { AnalyticsService } from './service/analytics.service';
import { DocumentActivity } from './entities/document-activity.entity';
import { UserActivity } from './entities/user-activity.entity';
import { SystemMetrics } from './entities/system-metrics.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentActivity, UserActivity, SystemMetrics]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}