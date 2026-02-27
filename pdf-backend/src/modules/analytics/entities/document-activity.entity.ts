import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum DocumentType {
  PDF_TO_WORD = 'pdf_to_word',
  WORD_TO_PDF = 'word_to_pdf',
  PDF_COMPRESSION = 'pdf_compression',
  OCR = 'ocr',
  MERGE_SPLIT = 'merge_split',
  IMAGE_TO_PDF = 'image_to_pdf',
  PDF_EDITOR = 'pdf_editor',
  E_SIGNATURE = 'e_signature',
}

export enum ActivityStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
  PROCESSING = 'processing',
}

@Entity('document_activities')
export class DocumentActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column()
  fileName: string;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  fileSize: number; // in MB

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  processingTime: number; // in seconds

  @Column({
    type: 'enum',
    enum: ActivityStatus,
    default: ActivityStatus.PROCESSING,
  })
  status: ActivityStatus;

  @Column({ nullable: true })
  errorMessage: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}