import { TypeOrmModule } from '@nestjs/typeorm';
import { Signature } from '../modules/e-signature/entities/signature.entity';
import { Document } from '../modules/e-signature/entities/document.entity';
import { Signer } from '../modules/e-signature/entities/signer.entity';
import { User } from '../modules/auth/entities/user.entity';
import { DocumentActivity } from '../modules/analytics/entities/document-activity.entity';
import { UserActivity } from '../modules/analytics/entities/user-activity.entity';
import { SystemMetrics } from '../modules/analytics/entities/system-metrics.entity';

export const databaseConfig = TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '9633195241',
  database: process.env.DB_NAME || 'pdf_nexus',
  entities: [Signature, Document, Signer, User, DocumentActivity, UserActivity, SystemMetrics],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV !== 'production',
  ssl: process.env.NODE_ENV === 'production',
  extra: {
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  },
});