import { Injectable, NotFoundException } from '@nestjs/common';
import { performance } from 'node:perf_hooks';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UrlSafetyService } from './url-safety.service';

type MonitorState = 'PENDING' | 'UP' | 'DOWN' | 'PAUSED';

type MonitorRecord = {
  id: string;
  userId: string;
  name: string;
  url: string;
  method: string;
  expectedStatus: number;
  timeoutMs: number;
  failureThreshold: number;
  status: MonitorState;
  consecutiveFailures: number;
};

type RawCheck = {
  successful: boolean;
  statusCode: number | null;
  responseMs: number;
  errorType: string | null;
  errorMessage: string | null;
};

@Injectable()
export class ChecksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly urlSafety: UrlSafetyService,
    private readonly notifications: NotificationsService,
  ) {}

  async checkOwnedMonitor(userId: string, monitorId: string) {
    const monitor = await this.prisma.monitor.findFirst({ where: { id: monitorId, userId } });
    if (!monitor) throw new NotFoundException('Monitor not found');
    return this.checkMonitor(monitor);
  }

  async checkMonitor(monitor: MonitorRecord) {
    const result = await this.execute(monitor);
    const now = new Date();
    const previousStatus = monitor.status;
    const nextFailures = result.successful ? 0 : monitor.consecutiveFailures + 1;
    const shouldBeDown = !result.successful && nextFailures >= monitor.failureThreshold;
    const isPaused = previousStatus === 'PAUSED';
    const nextStatus = isPaused
      ? 'PAUSED'
      : result.successful
        ? 'UP'
        : shouldBeDown
          ? 'DOWN'
          : previousStatus === 'PENDING'
            ? 'PENDING'
            : previousStatus;

    const persisted = await this.prisma.$transaction(async (tx) => {
      const check = await tx.checkResult.create({
        data: {
          monitorId: monitor.id,
          successful: result.successful,
          statusCode: result.statusCode,
          responseMs: result.responseMs,
          errorType: result.errorType,
          errorMessage: result.errorMessage,
          checkedAt: now,
        },
      });

      const updatedMonitor = await tx.monitor.update({
        where: { id: monitor.id },
        data: {
          status: nextStatus,
          consecutiveFailures: nextFailures,
          lastCheckedAt: now,
          lastResponseMs: result.responseMs,
          lastStatusCode: result.statusCode,
        },
      });

      let incidentAction: 'opened' | 'resolved' | null = null;
      const openIncident = await tx.incident.findFirst({
        where: { monitorId: monitor.id, resolvedAt: null },
        orderBy: { startedAt: 'desc' },
      });

      if (nextStatus === 'DOWN' && !openIncident) {
        await tx.incident.create({
          data: {
            monitorId: monitor.id,
            reason: result.errorMessage ?? (result.statusCode ? `Unexpected HTTP ${result.statusCode}` : 'Endpoint unavailable'),
          },
        });
        incidentAction = 'opened';
      }

      if (result.successful && openIncident) {
        await tx.incident.update({ where: { id: openIncident.id }, data: { resolvedAt: now } });
        incidentAction = 'resolved';
      }

      return { check, monitor: updatedMonitor, incidentAction };
    });

    if (persisted.incidentAction) {
      const state = persisted.incidentAction === 'opened' ? 'DOWN' : 'UP';
      const detail = state === 'DOWN'
        ? result.errorMessage ?? `HTTP ${result.statusCode ?? 'no response'} after ${result.responseMs} ms`
        : `Recovered with HTTP ${result.statusCode} in ${result.responseMs} ms`;
      void this.notifications.sendMonitorState({
        userId: monitor.userId,
        monitorName: monitor.name,
        monitorUrl: monitor.url,
        state,
        detail,
        at: now,
      }).catch(() => undefined);
    }

    return persisted;
  }

  private async execute(monitor: MonitorRecord): Promise<RawCheck> {
    const start = performance.now();
    try {
      let url = await this.urlSafety.assertSafePublicUrl(monitor.url);
      let response: Response | null = null;

      for (let redirect = 0; redirect <= 3; redirect += 1) {
        response = await fetch(url, {
          method: monitor.method === 'HEAD' ? 'HEAD' : 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(monitor.timeoutMs),
          headers: {
            'user-agent': 'PulseWatch/1.0 (+https://github.com/ozgeegungordu/pulse-watch)',
            accept: '*/*',
          },
        });

        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        const location = response.headers.get('location');
        if (!location) break;
        if (redirect === 3) throw new Error('Too many redirects');
        await response.body?.cancel();
        url = await this.urlSafety.assertSafePublicUrl(new URL(location, url).toString());
      }

      if (!response) throw new Error('No HTTP response received');
      await response.body?.cancel();
      const responseMs = Math.max(0, Math.round(performance.now() - start));
      const successful = response.status === monitor.expectedStatus;
      return {
        successful,
        statusCode: response.status,
        responseMs,
        errorType: successful ? null : 'UNEXPECTED_STATUS',
        errorMessage: successful ? null : `Expected HTTP ${monitor.expectedStatus}, received ${response.status}`,
      };
    } catch (error) {
      const responseMs = Math.max(0, Math.round(performance.now() - start));
      const message = error instanceof Error ? error.message : 'Unknown request error';
      return {
        successful: false,
        statusCode: null,
        responseMs,
        errorType: error instanceof Error ? error.name : 'REQUEST_ERROR',
        errorMessage: message.slice(0, 500),
      };
    }
  }
}
