import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { UrlSafetyService } from '../checks/url-safety.service';
import { CreateNotificationChannelDto } from './dto/create-notification-channel.dto';
import { UpdateNotificationChannelDto } from './dto/update-notification-channel.dto';

export type MonitorNotification = {
  userId: string;
  monitorName: string;
  monitorUrl: string;
  state: 'DOWN' | 'UP';
  detail: string;
  at: Date;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly urlSafety: UrlSafetyService,
  ) {}


  status() {
    const host = this.config.get<string>('SMTP_HOST');
    const user = this.config.get<string>('SMTP_USER');
    const from = this.config.get<string>('SMTP_FROM');
    return {
      emailConfigured: Boolean(host && user),
      smtpHost: host || null,
      smtpFrom: from || null,
      webhooksEnabled: true,
    };
  }

  async list(userId: string) {
    const channels = await this.prisma.notificationChannel.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return channels.map((channel) => ({
      ...channel,
      destination: this.maskDestination(channel.type, channel.destination),
    }));
  }

  async create(userId: string, dto: CreateNotificationChannelDto) {
    await this.validateDestination(dto.type, dto.destination);
    const channel = await this.prisma.notificationChannel.create({
      data: {
        userId,
        name: dto.name.trim(),
        type: dto.type,
        destination: dto.destination.trim(),
      },
    });
    return { ...channel, destination: this.maskDestination(channel.type, channel.destination) };
  }

  async update(userId: string, id: string, dto: UpdateNotificationChannelDto) {
    const existing = await this.prisma.notificationChannel.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Notification channel not found');
    const channel = await this.prisma.notificationChannel.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });
    return { ...channel, destination: this.maskDestination(channel.type, channel.destination) };
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.notificationChannel.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException('Notification channel not found');
    await this.prisma.notificationChannel.delete({ where: { id } });
    return { deleted: true };
  }

  async test(userId: string, id: string) {
    const channel = await this.prisma.notificationChannel.findFirst({ where: { id, userId } });
    if (!channel) throw new NotFoundException('Notification channel not found');
    await this.send(channel.type, channel.destination, {
      userId,
      monitorName: 'PulseWatch test',
      monitorUrl: 'https://example.com',
      state: 'UP',
      detail: 'Your notification channel is configured correctly.',
      at: new Date(),
    });
    return { sent: true };
  }

  async sendMonitorState(notification: MonitorNotification): Promise<void> {
    const channels = await this.prisma.notificationChannel.findMany({
      where: { userId: notification.userId, enabled: true },
    });

    const results = await Promise.allSettled(
      channels.map((channel) => this.send(channel.type, channel.destination, notification)),
    );
    results.forEach((result) => {
      if (result.status === 'rejected') {
        this.logger.warn(`Notification delivery failed: ${result.reason instanceof Error ? result.reason.message : 'unknown error'}`);
      }
    });
  }

  private async send(type: string, destination: string, notification: MonitorNotification) {
    if (type === 'EMAIL') return this.sendEmail(destination, notification);
    if (type === 'SLACK_WEBHOOK') return this.sendWebhook(destination, { text: this.message(notification) });
    if (type === 'DISCORD_WEBHOOK') return this.sendWebhook(destination, { content: this.message(notification) });
  }

  private async sendWebhook(url: string, body: object) {
    await this.urlSafety.assertSafePublicUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private async sendEmail(destination: string, notification: MonitorNotification) {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      throw new BadRequestException('SMTP_HOST is not configured');
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE', 'false') === 'true',
      auth: this.config.get<string>('SMTP_USER')
        ? {
            user: this.config.get<string>('SMTP_USER'),
            pass: this.config.get<string>('SMTP_PASS'),
          }
        : undefined,
    });

    await transporter.sendMail({
      from: this.config.get<string>('SMTP_FROM', 'PulseWatch <noreply@example.com>'),
      to: destination,
      subject: `[PulseWatch] ${notification.monitorName} is ${notification.state}`,
      text: this.message(notification),
    });
  }

  private message(notification: MonitorNotification): string {
    return `PulseWatch: ${notification.monitorName} is ${notification.state}. ${notification.detail} ${notification.monitorUrl}`;
  }

  private async validateDestination(type: string, destination: string) {
    const value = destination.trim();
    if (type === 'EMAIL') {
      if (!/^\S+@\S+\.\S+$/.test(value)) throw new BadRequestException('Invalid email address');
      return;
    }
    let url: URL;
    try { url = new URL(value); } catch { throw new BadRequestException('Invalid webhook URL'); }
    if (url.protocol !== 'https:') throw new BadRequestException('Webhook URL must use HTTPS');
    await this.urlSafety.assertSafePublicUrl(url.toString());
  }

  private maskDestination(type: string, destination: string): string {
    if (type === 'EMAIL') {
      const [local, domain] = destination.split('@');
      return local && domain ? `${local.slice(0, 2)}***@${domain}` : '***';
    }
    try {
      const url = new URL(destination);
      return `${url.origin}/***`;
    } catch {
      return '***';
    }
  }
}
