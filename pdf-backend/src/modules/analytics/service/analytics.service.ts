import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { DocumentActivity, DocumentType, ActivityStatus } from '../entities/document-activity.entity';
import { UserActivity, UserActivityType } from '../entities/user-activity.entity';
import { SystemMetrics } from '../entities/system-metrics.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(DocumentActivity)
    private documentActivityRepository: Repository<DocumentActivity>,
    @InjectRepository(UserActivity)
    private userActivityRepository: Repository<UserActivity>,
    @InjectRepository(SystemMetrics)
    private systemMetricsRepository: Repository<SystemMetrics>,
  ) {}

  async getKeyMetrics() {
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Total documents processed this month
    const totalDocuments = await this.documentActivityRepository.count({
      where: {
        createdAt: MoreThan(lastMonth),
        status: ActivityStatus.SUCCESS,
      },
    });

    // Active users (users who logged in within last 30 days)
    const activeUsers = await this.userActivityRepository
      .createQueryBuilder('ua')
      .select('COUNT(DISTINCT ua.userId)', 'count')
      .where('ua.activityType = :type', { type: UserActivityType.LOGIN })
      .andWhere('ua.createdAt > :date', { date: lastMonth })
      .getRawOne();

    // Average processing time
    const avgProcessingTime = await this.documentActivityRepository
      .createQueryBuilder('da')
      .select('AVG(da.processingTime)', 'avg')
      .where('da.processingTime IS NOT NULL')
      .andWhere('da.status = :status', { status: ActivityStatus.SUCCESS })
      .andWhere('da.createdAt > :date', { date: lastMonth })
      .getRawOne();

    // Success rate
    const totalProcessed = await this.documentActivityRepository.count({
      where: { createdAt: MoreThan(lastMonth) },
    });

    const successfulProcessed = await this.documentActivityRepository.count({
      where: {
        createdAt: MoreThan(lastMonth),
        status: ActivityStatus.SUCCESS,
      },
    });

    const successRate = totalProcessed > 0 ? (successfulProcessed / totalProcessed) * 100 : 100;

    return {
      totalDocuments,
      activeUsers: parseInt(activeUsers.count) || 0,
      avgProcessingTime: parseFloat(avgProcessingTime.avg) || 0,
      successRate: Math.round(successRate * 100) / 100,
    };
  }

  async getMonthlyTrends(months: number = 6) {
    const results = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const documents = await this.documentActivityRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
          status: ActivityStatus.SUCCESS,
        },
      });

      const users = await this.userActivityRepository
        .createQueryBuilder('ua')
        .select('COUNT(DISTINCT ua.userId)', 'count')
        .where('ua.activityType = :type', { type: UserActivityType.LOGIN })
        .andWhere('ua.createdAt BETWEEN :start AND :end', { start: startDate, end: endDate })
        .getRawOne();

      results.push({
        month: startDate.toLocaleDateString('en-US', { month: 'short' }),
        documents,
        users: parseInt(users.count) || 0,
      });
    }

    return results;
  }

  async getToolUsageDistribution() {
    const toolCounts = await this.documentActivityRepository
      .createQueryBuilder('da')
      .select('da.documentType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('da.status = :status', { status: ActivityStatus.SUCCESS })
      .groupBy('da.documentType')
      .getRawMany();

    const total = toolCounts.reduce((sum, item) => sum + parseInt(item.count), 0);

    return toolCounts.map(item => ({
      name: this.formatToolName(item.type),
      value: Math.round((parseInt(item.count) / total) * 100),
      count: parseInt(item.count),
    }));
  }

  async getSystemPerformance(hours: number = 24) {
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);

    const metrics = await this.systemMetricsRepository.find({
      where: { createdAt: MoreThan(startDate) },
      order: { createdAt: 'ASC' },
    });

    return metrics.map(metric => ({
      time: metric.createdAt.toTimeString().slice(0, 5),
      cpu: metric.cpuUsage,
      memory: metric.memoryUsage,
      jobs: metric.activeJobs,
    }));
  }

  async getDepartmentUsage() {
    // This would require department information in user profiles
    // For now, return mock data structure
    return [
      { dept: 'Legal', usage: 85, docs: 2847 },
      { dept: 'Marketing', usage: 72, docs: 1956 },
      { dept: 'Operations', usage: 68, docs: 1732 },
      { dept: 'Sales', usage: 45, docs: 1289 },
      { dept: 'HR', usage: 38, docs: 987 },
    ];
  }

  private formatToolName(type: DocumentType): string {
    const names: Record<DocumentType, string> = {
      [DocumentType.PDF_TO_WORD]: 'PDF to Word',
      [DocumentType.WORD_TO_PDF]: 'Word to PDF',
      [DocumentType.PDF_COMPRESSION]: 'PDF Compression',
      [DocumentType.OCR]: 'OCR Scanner',
      [DocumentType.MERGE_SPLIT]: 'Merge & Split',
      [DocumentType.IMAGE_TO_PDF]: 'Image to PDF',
      [DocumentType.PDF_EDITOR]: 'PDF Editor',
      [DocumentType.E_SIGNATURE]: 'E-Signature',
    };
    return names[type] || type;
  }

  // Methods for tracking activities
  async trackDocumentActivity(data: {
    documentType: DocumentType;
    fileName: string;
    fileSize?: number;
    userId: string | null;
    status?: 'success' | 'failed' | 'processing';
    errorMessage?: string;
    processingTime?: number;
  }) {
    const statusMap = {
      'success': ActivityStatus.SUCCESS,
      'failed': ActivityStatus.FAILED,
      'processing': ActivityStatus.PROCESSING,
    };

    const activity = this.documentActivityRepository.create({
      ...data,
      status: statusMap[data.status || 'processing'],
    });
    return this.documentActivityRepository.save(activity);
  }

  async trackUserActivity(data: {
    activityType: UserActivityType;
    userId: string | null;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
  }) {
    const activity = this.userActivityRepository.create(data);
    return this.userActivityRepository.save(activity);
  }

  async recordSystemMetrics(data: {
    cpuUsage: number;
    memoryUsage: number;
    activeJobs: number;
    diskUsage?: number;
    totalRequests?: number;
    avgResponseTime?: number;
  }) {
    const metrics = this.systemMetricsRepository.create(data);
    return this.systemMetricsRepository.save(metrics);
  }

  async getAuditLogs(options: {
    limit?: number;
    offset?: number;
    userId?: string;
    activityType?: string;
    documentType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const { limit = 50, offset = 0, userId, activityType, documentType, startDate, endDate } = options;

    // Define activity type mappings
    const userActivityTypes = ['login', 'logout', 'register', 'password_change', 'profile_update'];
    const documentActivityTypes = ['pdf_to_word', 'word_to_pdf', 'pdf_compression', 'ocr', 'merge_split', 'image_to_pdf', 'pdf_editor', 'e_signature'];

    // Build where conditions for user activities
    const userWhereConditions: any = {};
    if (userId) userWhereConditions.userId = userId;
    if (activityType && userActivityTypes.includes(activityType)) {
      userWhereConditions.activityType = activityType as UserActivityType;
    }
    if (startDate || endDate) {
      userWhereConditions.createdAt = {};
      if (startDate) userWhereConditions.createdAt = MoreThan(startDate);
      if (endDate) userWhereConditions.createdAt = Between(startDate || new Date(0), endDate);
    }

    // Build where conditions for document activities
    const docWhereConditions: any = {};
    if (userId) docWhereConditions.userId = userId;
    if (activityType && documentActivityTypes.includes(activityType)) {
      docWhereConditions.documentType = activityType as DocumentType;
    }
    if (documentType) docWhereConditions.documentType = documentType as DocumentType;
    if (startDate || endDate) {
      docWhereConditions.createdAt = {};
      if (startDate) docWhereConditions.createdAt = MoreThan(startDate);
      if (endDate) docWhereConditions.createdAt = Between(startDate || new Date(0), endDate);
    }

    // Get user activities (only if no specific activity type filter or if it's a user activity type)
    const shouldFetchUserActivities = !activityType || userActivityTypes.includes(activityType);
    const userActivities = shouldFetchUserActivities ? await this.userActivityRepository.find({
      where: userWhereConditions,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    }) : [];

    // Get document activities (only if no specific activity type filter or if it's a document activity type)
    const shouldFetchDocumentActivities = !activityType || documentActivityTypes.includes(activityType);
    const documentActivities = shouldFetchDocumentActivities ? await this.documentActivityRepository.find({
      where: docWhereConditions,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    }) : [];

    // Combine and sort by createdAt
    const allActivities = [
      ...userActivities.map(activity => ({
        id: activity.id,
        type: 'user_activity' as const,
        activityType: activity.activityType,
        documentType: null,
        fileName: null,
        fileSize: null,
        processingTime: null,
        status: null,
        createdAt: activity.createdAt,
        user: activity.user,
        ipAddress: activity.ipAddress,
        userAgent: activity.userAgent,
        metadata: activity.metadata,
      })),
      ...documentActivities.map(activity => ({
        id: activity.id,
        type: 'document_activity' as const,
        activityType: null,
        documentType: activity.documentType,
        fileName: activity.fileName,
        fileSize: activity.fileSize,
        processingTime: activity.processingTime,
        status: activity.status,
        createdAt: activity.createdAt,
        user: activity.user,
        ipAddress: null,
        userAgent: null,
        metadata: null,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination after sorting
    return allActivities.slice(offset, offset + limit);
  }

  async getAuditLogsCount(options: {
    userId?: string;
    activityType?: string;
    documentType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}) {
    const { userId, activityType, documentType, startDate, endDate } = options;

    // Define activity type mappings
    const userActivityTypes = ['login', 'logout', 'register', 'password_change', 'profile_update'];
    const documentActivityTypes = ['pdf_to_word', 'word_to_pdf', 'pdf_compression', 'ocr', 'merge_split', 'image_to_pdf', 'pdf_editor', 'e_signature'];

    // Build where conditions for user activities
    const userWhereConditions: any = {};
    if (userId) userWhereConditions.userId = userId;
    if (activityType && userActivityTypes.includes(activityType)) {
      userWhereConditions.activityType = activityType as UserActivityType;
    }
    if (startDate || endDate) {
      userWhereConditions.createdAt = {};
      if (startDate) userWhereConditions.createdAt = MoreThan(startDate);
      if (endDate) userWhereConditions.createdAt = Between(startDate || new Date(0), endDate);
    }

    // Build where conditions for document activities
    const docWhereConditions: any = {};
    if (userId) docWhereConditions.userId = userId;
    if (activityType && documentActivityTypes.includes(activityType)) {
      docWhereConditions.documentType = activityType as DocumentType;
    }
    if (documentType) docWhereConditions.documentType = documentType as DocumentType;
    if (startDate || endDate) {
      docWhereConditions.createdAt = {};
      if (startDate) docWhereConditions.createdAt = MoreThan(startDate);
      if (endDate) docWhereConditions.createdAt = Between(startDate || new Date(0), endDate);
    }

    // Count user activities (only if no specific activity type filter or if it's a user activity type)
    const shouldCountUserActivities = !activityType || userActivityTypes.includes(activityType);
    const userCount = shouldCountUserActivities ? await this.userActivityRepository.count({
      where: userWhereConditions,
    }) : 0;

    // Count document activities (only if no specific activity type filter or if it's a document activity type)
    const shouldCountDocumentActivities = !activityType || documentActivityTypes.includes(activityType);
    const docCount = shouldCountDocumentActivities ? await this.documentActivityRepository.count({
      where: docWhereConditions,
    }) : 0;

    return userCount + docCount;
  }
}