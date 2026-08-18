import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChecksService } from './checks.service';
import { SchedulerService } from './scheduler.service';
import { UrlSafetyService } from './url-safety.service';

@Module({
  imports: [NotificationsModule],
  providers: [ChecksService, SchedulerService, UrlSafetyService],
  exports: [ChecksService, UrlSafetyService],
})
export class ChecksModule {}
