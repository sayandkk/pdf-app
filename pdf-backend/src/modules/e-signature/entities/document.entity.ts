import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Signer } from './signer.entity';
import { User } from '../../auth/entities/user.entity';

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  COMPLETED = 'completed',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  title: string;

  @Column()
  originalFileName: string;

  @Column()
  filePath: string;

  @Column({ nullable: true })
  signedFilePath?: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  status: DocumentStatus;

  @CreateDateColumn()
  created: Date;

  @Column({ nullable: true })
  deadline?: Date;

  @Column({ nullable: true })
  message?: string;

  @Column({ default: 0 })
  completedSigners: number;

  @OneToMany(() => Signer, signer => signer.document, { cascade: true })
  signers: Signer[];
}