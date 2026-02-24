import { Test, TestingModule } from '@nestjs/testing';
import { AppService } from './app.service';
import { PrismaService } from '@pris/prisma.service';
import { createMockPrisma } from './test/mocks';

describe('AppService', () => {
  let service: AppService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHello', () => {
    it('should return Hello World!', () => {
      expect(service.getHello()).toBe('Hello World!');
    });
  });

  describe('getStats', () => {
    it('should return totalUsers, totalPosts, latestUsers, recentPosts', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.post.count.mockResolvedValue(5);
      const latestUsers = [
        {
          id: 1,
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          avatar: null,
        },
      ];
      const recentPosts = [
        {
          id: 1,
          title: 'T',
          createdAt: new Date(),
          author: { firstName: 'A', lastName: 'B' },
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(latestUsers as never);
      mockPrisma.post.findMany.mockResolvedValue(recentPosts as never);

      const result = await service.getStats();

      expect(result).toEqual({
        totalUsers: 10,
        totalPosts: 5,
        latestUsers,
        recentPosts,
      });
      expect(mockPrisma.user.count).toHaveBeenCalled();
      expect(mockPrisma.post.count).toHaveBeenCalled();
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      });
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith({
        take: 3,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          createdAt: true,
          author: { select: { firstName: true, lastName: true } },
        },
      });
    });
  });
});
