import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UrlSafetyService } from '../checks/url-safety.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, UrlSafetyService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
