import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from '../service/dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }

  @Get('recent-jobs')
  async getRecentJobs(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 5;
    return this.dashboardService.getRecentJobs(limitNum);
  }

  @Get('system-usage')
  async getSystemUsage() {
    return this.dashboardService.getSystemUsage();
  }
}