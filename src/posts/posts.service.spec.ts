import { Test, TestingModule } from '@nestjs/testing';
import { PostsService } from './posts.service';
import { PrismaService } from '@pris/prisma.service';

describe('PostsService', () => {
  let service: PostsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PostsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it('should be defined and initialized properly', () => {
    expect(service).toBeDefined();
  });
});
