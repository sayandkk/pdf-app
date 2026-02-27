import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { ESignatureController } from './controller/e-signature.controller';
import { ESignatureService } from './service/e-signature.service';
import { Signature } from './entities/signature.entity';
import { Document } from './entities/document.entity';
import { Signer } from './entities/signer.entity';
import { User } from '../auth/entities/user.entity';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Signature, Document, Signer, User]),
    MulterModule.register({
      storage: require('multer').memoryStorage(),
    }),
    AnalyticsModule,
    AuthModule,
  ],
  controllers: [ESignatureController],
  providers: [ESignatureService],
  exports: [ESignatureService],
})
export class ESignatureModule {}