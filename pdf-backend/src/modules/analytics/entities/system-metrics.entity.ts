import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('system_metrics')
export class SystemMetrics {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('decimal', { precision: 5, scale: 2 })
  cpuUsage: number; // percentage

  @Column('decimal', { precision: 5, scale: 2 })
  memoryUsage: number; // percentage

  @Column('int')
  activeJobs: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  diskUsage: number; // percentage

  @Column('int', { nullable: true })
  totalRequests: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  avgResponseTime: number; // in milliseconds

  @CreateDateColumn()
  createdAt: Date;
}