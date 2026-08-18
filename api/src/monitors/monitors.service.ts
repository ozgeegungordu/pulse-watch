import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { UrlSafetyService } from '../checks/url-safety.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';

@Injectable()
export class MonitorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly urlSafety: UrlSafetyService,
  ) {}

  async create(userId: string, dto: CreateMonitorDto) {
    await this.urlSafety.assertSafePublicUrl(dto.url);
    return this.prisma.monitor.create({
      data: {
        userId,
        name: dto.name.trim(),
        url: dto.url.trim(),
        method: dto.method ?? 'GET',
        expectedStatus: dto.expectedStatus ?? 200,
        timeoutMs: dto.timeoutMs ?? 5000,
        intervalSec: dto.intervalSec ?? 60,
        failureThreshold: dto.failureThreshold ?? 3,
      },
    });
  }

  list(userId: string) {
    return this.prisma.monitor.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { checks: true, incidents: true } } },
    });
  }

  async get(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { id, userId },
      include: {
        checks: { orderBy: { checkedAt: 'desc' }, take: 120 },
        incidents: { orderBy: { startedAt: 'desc' }, take: 50 },
      },
    });
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  async stats(userId: string, id: string) {
    await this.getOwned(userId, id);
    const now = Date.now();
    const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const checks = await this.prisma.checkResult.findMany({
      where: { monitorId: id, checkedAt: { gte: since7d } },
      select: { successful: true, responseMs: true, checkedAt: true },
      orderBy: { checkedAt: 'asc' },
    });

    const summarize = (hours: number) => {
      const since = now - hours * 60 * 60 * 1000;
      const window = checks.filter((check) => check.checkedAt.getTime() >= since);
      if (!window.length) return { uptimePct: 100, avgResponseMs: 0, p95ResponseMs: 0, checks: 0 };
      const successful = window.filter((check) => check.successful).length;
      const times = window.map((check) => check.responseMs).sort((a, b) => a - b);
      const p95Index = Math.min(times.length - 1, Math.ceil(times.length * 0.95) - 1);
      return {
        uptimePct: Number(((successful / window.length) * 100).toFixed(2)),
        avgResponseMs: Math.round(times.reduce((sum, value) => sum + value, 0) / times.length),
        p95ResponseMs: times[p95Index] ?? 0,
        checks: window.length,
      };
    };

    return { last24h: summarize(24), last7d: summarize(24 * 7) };
  }

  async getOwned(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findFirst({ where: { id, userId } });
    if (!monitor) throw new NotFoundException('Monitor not found');
    return monitor;
  }

  async update(userId: string, id: string, dto: UpdateMonitorDto) {
    await this.getOwned(userId, id);
    if (dto.url) await this.urlSafety.assertSafePublicUrl(dto.url);
    return this.prisma.monitor.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.url !== undefined ? { url: dto.url.trim(), status: 'PENDING', consecutiveFailures: 0 } : {}),
        ...(dto.method !== undefined ? { method: dto.method } : {}),
        ...(dto.expectedStatus !== undefined ? { expectedStatus: dto.expectedStatus } : {}),
        ...(dto.timeoutMs !== undefined ? { timeoutMs: dto.timeoutMs } : {}),
        ...(dto.intervalSec !== undefined ? { intervalSec: dto.intervalSec } : {}),
        ...(dto.failureThreshold !== undefined ? { failureThreshold: dto.failureThreshold } : {}),
      },
    });
  }

  async setPublicStatus(userId: string, id: string, enabled: boolean) {
    const monitor = await this.getOwned(userId, id);
    const publicSlug = enabled ? monitor.publicSlug ?? randomBytes(12).toString('hex') : monitor.publicSlug;
    return this.prisma.monitor.update({
      where: { id },
      data: { publicEnabled: enabled, publicSlug },
      select: { publicEnabled: true, publicSlug: true },
    });
  }

  async pause(userId: string, id: string) {
    await this.getOwned(userId, id);
    return this.prisma.monitor.update({ where: { id }, data: { status: 'PAUSED' } });
  }

  async resume(userId: string, id: string) {
    await this.getOwned(userId, id);
    return this.prisma.monitor.update({
      where: { id },
      data: { status: 'PENDING', consecutiveFailures: 0, lastCheckedAt: null },
    });
  }

  async remove(userId: string, id: string) {
    await this.getOwned(userId, id);
    await this.prisma.monitor.delete({ where: { id } });
    return { deleted: true };
  }
}
