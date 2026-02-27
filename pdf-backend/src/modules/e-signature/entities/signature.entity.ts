import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

export enum SignatureStyle {
  CURSIVE = 'cursive',
  PRINT = 'print',
  INITIALS = 'initials',
}

@Entity('signatures')
export class Signature {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: SignatureStyle,
  })
  style: SignatureStyle;

  @Column({ nullable: true })
  signatureData?: string;

  @CreateDateColumn()
  created: Date;
}