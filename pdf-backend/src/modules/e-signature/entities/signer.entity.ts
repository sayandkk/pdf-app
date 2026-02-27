import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Document } from './document.entity';

export enum SignerStatus {
  SENT = 'sent',
  PENDING = 'pending',
  SIGNED = 'signed',
}

@Entity('signers')
export class Signer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  role?: string;

  @Column({
    type: 'enum',
    enum: SignerStatus,
    default: SignerStatus.SENT,
  })
  status: SignerStatus;

  @Column({ nullable: true })
  signedAt?: Date;

  @ManyToOne(() => Document, document => document.signers)
  @JoinColumn({ name: 'documentId' })
  document: Document;

  @Column()
  documentId: string;
}