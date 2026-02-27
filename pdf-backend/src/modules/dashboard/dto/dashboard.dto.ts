export class DashboardStatsDto {
  documentsProcessedToday: number;
  activeUsers: number;
  queueLength: number;
  successRate: number;
}

export class RecentJobDto {
  id: string;
  name: string;
  type: string;
  status: 'completed' | 'processing' | 'queued' | 'failed';
  user: string;
  createdAt: Date;
}

export class SystemUsageDto {
  cpuUsage: number;
  memoryUsage: number;
  storageUsage: number;
  activeJobs: number;
  maxJobs: number;
}