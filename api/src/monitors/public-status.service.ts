import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicStatusService {
  constructor(private readonly prisma: PrismaService) {}

  async get(slug: string) {
    const monitor = await this.prisma.monitor.findFirst({
      where: { publicSlug: slug, publicEnabled: true },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        lastCheckedAt: true,
        lastResponseMs: true,
        lastStatusCode: true,
        createdAt: true,
      },
    });
    if (!monitor) throw new NotFoundException('Public status page not found');

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [checks24h, recentChecks, incidents] = await Promise.all([
      this.prisma.checkResult.findMany({
        where: { monitorId: monitor.id, checkedAt: { gte: since24h } },
        select: { successful: true, responseMs: true },
      }),
      this.prisma.checkResult.findMany({
        where: { monitorId: monitor.id },
        select: { successful: true, responseMs: true, statusCode: true, checkedAt: true },
        orderBy: { checkedAt: 'desc' },
        take: 60,
      }),
      this.prisma.incident.findMany({
        where: { monitorId: monitor.id },
        select: { id: true, startedAt: true, resolvedAt: true, reason: true },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
    ]);

    const successful = checks24h.filter((check) => check.successful).length;
    const avgResponseMs = checks24h.length
      ? Math.round(checks24h.reduce((sum, check) => sum + check.responseMs, 0) / checks24h.length)
      : 0;

    return {
      name: monitor.name,
      url: monitor.url,
      status: monitor.status,
      lastCheckedAt: monitor.lastCheckedAt,
      lastResponseMs: monitor.lastResponseMs,
      lastStatusCode: monitor.lastStatusCode,
      createdAt: monitor.createdAt,
      uptime24h: checks24h.length ? Number(((successful / checks24h.length) * 100).toFixed(2)) : 100,
      avgResponseMs24h: avgResponseMs,
      checks24h: checks24h.length,
      recentChecks,
      incidents,
    };
  }
}
