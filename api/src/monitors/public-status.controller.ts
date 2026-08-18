import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PublicStatusService } from './public-status.service';

@ApiTags('public-status')
@Controller('public/status')
export class PublicStatusController {
  constructor(private readonly publicStatus: PublicStatusService) {}

  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.publicStatus.get(slug);
  }
}
