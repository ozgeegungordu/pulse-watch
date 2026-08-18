import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string) {
    const monitors = await this.prisma.monitor.findMany({ where: { userId } });
    const monitorIds = monitors.map((monitor) => monitor.id);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [checks, activeIncidents, recentIncidents] = monitorIds.length
      ? await Promise.all([
          this.prisma.checkResult.findMany({
            where: { monitorId: { in: monitorIds }, checkedAt: { gte: since } },
            select: { successful: true, responseMs: true },
          }),
          this.prisma.incident.count({ where: { monitorId: { in: monitorIds }, resolvedAt: null } }),
          this.prisma.incident.findMany({
            where: { monitorId: { in: monitorIds } },
            include: { monitor: { select: { id: true, name: true } } },
            orderBy: { startedAt: 'desc' },
            take: 8,
          }),
        ])
      : [[], 0, []];

    const totalChecks = checks.length;
    const successfulChecks = checks.filter((check) => check.successful).length;
    const avgResponseMs = totalChecks
      ? Math.round(checks.reduce((sum, check) => sum + check.responseMs, 0) / totalChecks)
      : 0;

    const counts = { UP: 0, DOWN: 0, PAUSED: 0, PENDING: 0 };
    for (const monitor of monitors) counts[monitor.status] += 1;

    return {
      total: monitors.length,
      operational: counts.UP,
      down: counts.DOWN,
      paused: counts.PAUSED,
      pending: counts.PENDING,
      uptimePct: totalChecks ? Number(((successfulChecks / totalChecks) * 100).toFixed(2)) : 100,
      avgResponseMs,
      checks24h: totalChecks,
      activeIncidents,
      recentIncidents,
    };
  }
}
