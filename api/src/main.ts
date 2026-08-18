import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const port = Number(config.get<string>('PORT') ?? 3000);
  const webOrigin = config.get<string>('WEB_ORIGIN', 'http://localhost:5173');

  app.setGlobalPrefix('api');
  app.enableCors({ origin: webOrigin.split(',').map((item) => item.trim()), credentials: true });
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('PulseWatch API')
    .setDescription('Uptime, response-time, incident and notification API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(port, '0.0.0.0');
  logger.log(`API running at http://localhost:${port}/api`);
  logger.log(`Swagger running at http://localhost:${port}/docs`);
}

void bootstrap();
