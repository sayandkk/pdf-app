import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './modules/auth/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
dotenv.config();

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));

  const email = process.env.SEED_EMAIL || 'admin@example.com';
  const password = process.env.SEED_PASSWORD || 'Admin@1234';

  const existing = await userRepo.findOne({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — skipping.`);
    await app.close();
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = userRepo.create({
    email,
    password: hashed,
    firstName: 'Admin',
    lastName: 'User',
    role: UserRole.ADMIN,
    isActive: true,
  });

  await userRepo.save(user);
  console.log(`✅ Admin user created: ${email} / ${password}`);
  await app.close();
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
