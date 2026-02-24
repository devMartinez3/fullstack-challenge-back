import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let controller: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const mockAppService = {
      getHello: jest.fn().mockReturnValue('Hello World!'),
      getStats: jest.fn().mockResolvedValue({
        totalUsers: 0,
        totalPosts: 0,
        latestUsers: [],
        recentPosts: [],
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: AppService, useValue: mockAppService },
      ],
    }).compile();

    controller = module.get<AppController>(AppController);
    appService = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getHello should return value from AppService', () => {
    expect(controller.getHello()).toBe('Hello World!');
    expect(appService.getHello).toHaveBeenCalled();
  });

  it('getStats should return value from AppService', async () => {
    const stats = await controller.getStats();
    expect(stats).toEqual({
      totalUsers: 0,
      totalPosts: 0,
      latestUsers: [],
      recentPosts: [],
    });
    expect(appService.getStats).toHaveBeenCalled();
  });
});
