import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configuredSecret = config.get<string>('JWT_SECRET');
        const isProduction = config.get<string>('NODE_ENV') === 'production';
        if (!configuredSecret && isProduction) {
          throw new Error('JWT_SECRET is required in production');
        }
        return {
          global: true,
          secret: configuredSecret ?? 'pulsewatch-local-development-secret-change-me',
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordService, AuthGuard],
  exports: [AuthGuard, JwtModule],
})
export class AuthModule {}
