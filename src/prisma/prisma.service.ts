import { Injectable } from '@nestjs/common';
import { env } from 'node:process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
  }
}
