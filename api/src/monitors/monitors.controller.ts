import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { ChecksService } from '../checks/checks.service';
import { CreateMonitorDto } from './dto/create-monitor.dto';
import { UpdateMonitorDto } from './dto/update-monitor.dto';
import { PublicStatusDto } from './dto/public-status.dto';
import { MonitorsService } from './monitors.service';

@ApiTags('monitors')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('monitors')
export class MonitorsController {
  constructor(
    private readonly monitors: MonitorsService,
    private readonly checks: ChecksService,
  ) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.monitors.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateMonitorDto) {
    return this.monitors.create(user.sub, dto);
  }

  @Get(':id')
  get(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.monitors.get(user.sub, id);
  }

  @Get(':id/stats')
  stats(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.monitors.stats(user.sub, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateMonitorDto) {
    return this.monitors.update(user.sub, id, dto);
  }

  @Patch(':id/public-status')
  publicStatus(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: PublicStatusDto) {
    return this.monitors.setPublicStatus(user.sub, id, dto.enabled);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.monitors.remove(user.sub, id);
  }

  @Post(':id/check')
  check(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.checks.checkOwnedMonitor(user.sub, id);
  }

  @Post(':id/pause')
  pause(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.monitors.pause(user.sub, id);
  }

  @Post(':id/resume')
  resume(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.monitors.resume(user.sub, id);
  }
}
