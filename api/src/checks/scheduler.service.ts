import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ChecksService } from './checks.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly checks: ChecksService,
    private readonly config: ConfigService,
  ) {}

  @Interval(30_000)
  async runDueChecks(): Promise<void> {
    if (this.running || this.config.get<string>('ENABLE_SCHEDULER', 'true') !== 'true') return;
    this.running = true;
    try {
      const monitors = await this.prisma.monitor.findMany({ where: { status: { not: 'PAUSED' } } });
      const now = Date.now();
      const due = monitors.filter((monitor) => {
        if (!monitor.lastCheckedAt) return true;
        return now - monitor.lastCheckedAt.getTime() >= monitor.intervalSec * 1000;
      });

      const batchSize = Math.max(1, Number(this.config.get<string>('CHECK_WORKER_BATCH_SIZE') ?? 10));
      for (let index = 0; index < due.length; index += batchSize) {
        const batch = due.slice(index, index + batchSize);
        await Promise.allSettled(batch.map((monitor) => this.checks.checkMonitor(monitor)));
      }
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Scheduler failed');
    } finally {
      this.running = false;
    }
  }
}
