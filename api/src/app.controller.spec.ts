import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  it('delegates health checks to the service', async () => {
    const service = { getHealth: jest.fn().mockResolvedValue({ status: 'ok' }) };
    const module = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: service }],
    }).compile();
    await expect(module.get(AppController).getHealth()).resolves.toEqual({ status: 'ok' });
  });
});
