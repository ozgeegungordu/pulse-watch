import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateMonitorDto {
  @ApiProperty({ example: 'Production API' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ example: 'https://example.com/health' })
  @IsString()
  @MaxLength(2000)
  url!: string;

  @ApiPropertyOptional({ enum: ['GET', 'HEAD'], default: 'GET' })
  @IsOptional()
  @IsIn(['GET', 'HEAD'])
  method?: 'GET' | 'HEAD';

  @ApiPropertyOptional({ default: 200 })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(599)
  expectedStatus?: number;

  @ApiPropertyOptional({ default: 5000 })
  @IsOptional()
  @IsInt()
  @Min(500)
  @Max(30000)
  timeoutMs?: number;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(30)
  @Max(86400)
  intervalSec?: number;

  @ApiPropertyOptional({ default: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  failureThreshold?: number;
}
