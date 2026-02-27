import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './controller/dashboard.controller';
import { DashboardService } from './service/dashboard.service';
import { DocumentActivity } from '../analytics/entities/document-activity.entity';
import { UserActivity } from '../analytics/entities/user-activity.entity';
import { SystemMetrics } from '../analytics/entities/system-metrics.entity';
import { User } from '../auth/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentActivity, UserActivity, SystemMetrics, User]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}