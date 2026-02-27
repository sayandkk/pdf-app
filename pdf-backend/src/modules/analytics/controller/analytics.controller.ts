import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { AnalyticsService } from '../service/analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('key-metrics')
  async getKeyMetrics() {
    return this.analyticsService.getKeyMetrics();
  }

  @Get('monthly-trends')
  async getMonthlyTrends(@Query('months') months?: string) {
    const monthsCount = months ? parseInt(months) : 6;
    return this.analyticsService.getMonthlyTrends(monthsCount);
  }

  @Get('tool-usage')
  async getToolUsageDistribution() {
    return this.analyticsService.getToolUsageDistribution();
  }

  @Get('system-performance')
  async getSystemPerformance(@Query('hours') hours?: string) {
    const hoursCount = hours ? parseInt(hours) : 24;
    return this.analyticsService.getSystemPerformance(hoursCount);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('userId') userId?: string,
    @Query('activityType') activityType?: string,
    @Query('documentType') documentType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
      userId,
      activityType,
      documentType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return this.analyticsService.getAuditLogs(options);
  }

  @Get('audit-logs/count')
  async getAuditLogsCount(
    @Query('userId') userId?: string,
    @Query('activityType') activityType?: string,
    @Query('documentType') documentType?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const options = {
      userId,
      activityType,
      documentType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    };

    return { count: await this.analyticsService.getAuditLogsCount(options) };
  }
}