import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PostsService } from './posts.service';
import { PrismaService } from '@pris/prisma.service';
import { createMockPrisma } from '../test/mocks';

describe('PostsService', () => {
  let service: PostsService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException when author user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const dto = {
        title: 'Test',
        content: 'Content here',
        authorUserId: 999,
      };

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
      await expect(service.create(dto)).rejects.toThrow(
        /999.*no existe guardado localmente/,
      );
      expect(mockPrisma.post.create).not.toHaveBeenCalled();
    });

    it('should create post with author when user exists', async () => {
      const author = {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      };
      mockPrisma.user.findUnique.mockResolvedValue(author);
      const createdPost = {
        id: 1,
        title: 'Test',
        content: 'Content',
        authorUserId: 1,
        author,
      };
      mockPrisma.post.create.mockResolvedValue(createdPost as never);
      const dto = {
        title: 'Test',
        content: 'Content here',
        authorUserId: 1,
      };

      const result = await service.create(dto);

      expect(result).toEqual(createdPost);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockPrisma.post.create).toHaveBeenCalledWith({
        data: dto,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });
    });
  });

  describe('findAll', () => {
    it('should return paginated posts without filter', async () => {
      const posts = [
        {
          id: 1,
          title: 'P1',
          content: 'C1',
          authorUserId: 1,
          author: { id: 1, firstName: 'A', lastName: 'B', avatar: null },
        },
      ];
      mockPrisma.post.findMany.mockResolvedValue(posts as never);
      mockPrisma.post.count.mockResolvedValue(1);

      const result = await service.findAll(1, 10);

      expect(result.data).toEqual(posts);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        lastPage: 1,
        limit: 10,
      });
      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          where: {},
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(mockPrisma.post.count).toHaveBeenCalledWith({ where: {} });
    });

    it('should filter by authorUserId when provided', async () => {
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(0);

      await service.findAll(2, 5, 3);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
          where: { authorUserId: 3 },
        }),
      );
      expect(mockPrisma.post.count).toHaveBeenCalledWith({
        where: { authorUserId: 3 },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(99)).rejects.toThrow(
        /Publicación con ID 99 no encontrada/,
      );
    });

    it('should return post with author when found', async () => {
      const post = {
        id: 1,
        title: 'T',
        content: 'C',
        authorUserId: 1,
        author: { id: 1, firstName: 'A', lastName: 'B' },
      };
      mockPrisma.post.findUnique.mockResolvedValue(post as never);

      const result = await service.findOne(1);

      expect(result).toEqual(post);
      expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { author: true },
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.update(99, { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.post.update).not.toHaveBeenCalled();
    });

    it('should update and return post when it exists', async () => {
      const existing = {
        id: 1,
        title: 'Old',
        content: 'C',
        authorUserId: 1,
        author: {},
      };
      const updated = { ...existing, title: 'New' };
      mockPrisma.post.findUnique.mockResolvedValue(existing as never);
      mockPrisma.post.update.mockResolvedValue(updated as never);

      const result = await service.update(1, { title: 'New' });

      expect(result).toEqual(updated);
      expect(mockPrisma.post.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { title: 'New' },
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when post does not exist', async () => {
      mockPrisma.post.findUnique.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.post.delete).not.toHaveBeenCalled();
    });

    it('should delete and return post when it exists', async () => {
      const post = {
        id: 1,
        title: 'T',
        content: 'C',
        authorUserId: 1,
        author: {},
      };
      mockPrisma.post.findUnique.mockResolvedValue(post as never);
      mockPrisma.post.delete.mockResolvedValue(post as never);

      const result = await service.remove(1);

      expect(result).toEqual(post);
      expect(mockPrisma.post.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
