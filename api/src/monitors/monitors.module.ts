import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChecksModule } from '../checks/checks.module';
import { MonitorsController } from './monitors.controller';
import { PublicStatusController } from './public-status.controller';
import { PublicStatusService } from './public-status.service';
import { MonitorsService } from './monitors.service';

@Module({
  imports: [AuthModule, ChecksModule],
  controllers: [MonitorsController, PublicStatusController],
  providers: [MonitorsService, PublicStatusService],
})
export class MonitorsModule {}
