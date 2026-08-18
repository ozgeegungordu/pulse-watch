import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{
        provide: AppService,
        useValue: { getHealth: () => ({ status: 'ok', service: 'pulse-watch-api' }) },
      }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(() => app.close());

  it('/api/health (GET)', () =>
    request(app.getHttpServer()).get('/api/health').expect(200).expect((response) => {
      expect(response.body.status).toBe('ok');
    }));
});
