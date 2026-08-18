import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      status: 'ok' as const,
      service: 'pulse-watch-api',
      database: 'ok' as const,
      timestamp: new Date().toISOString(),
    };
  }
}
