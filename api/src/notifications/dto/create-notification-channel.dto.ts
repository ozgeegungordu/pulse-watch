import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateNotificationChannelDto {
  @ApiProperty({ example: 'Team Discord' })
  @IsString()
  @MaxLength(80)
  name!: string;

  @ApiProperty({ enum: ['EMAIL', 'SLACK_WEBHOOK', 'DISCORD_WEBHOOK'] })
  @IsIn(['EMAIL', 'SLACK_WEBHOOK', 'DISCORD_WEBHOOK'])
  type!: 'EMAIL' | 'SLACK_WEBHOOK' | 'DISCORD_WEBHOOK';

  @ApiProperty({ example: 'alerts@example.com' })
  @IsString()
  @MaxLength(2000)
  destination!: string;
}
