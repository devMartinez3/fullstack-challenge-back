import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@pris/prisma.service';
import { Post, Prisma } from '@pris/generated/prisma/client';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';

export interface ReqResPost {
  id: number;
  title: string;
  body: string;
  userId: string;
}

export interface ReqResResponse {
  data: ReqResPost;
}
@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async create(createPostDto: CreatePostDto): Promise<
    Prisma.PostGetPayload<{
      include: {
        author: {
          select: { id: true; firstName: true; lastName: true; email: true };
        };
      };
    }>
  > {
    // Verify that the user exists first to provide a better error message if missing
    const user = await this.prisma.user.findUnique({
      where: { id: createPostDto.authorUserId },
    });

    if (!user) {
      throw new NotFoundException(
        `El usuario con ID ${createPostDto.authorUserId} no existe guardado localmente`,
      );
    }

    return this.prisma.post.create({
      data: createPostDto,
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
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    authorUserId?: number,
  ): Promise<{
    data: Prisma.PostGetPayload<{
      include: {
        author: {
          select: { id: true; firstName: true; lastName: true; avatar: true };
        };
      };
    }>[];
    meta: {
      total: number;
      page: number;
      lastPage: number;
      limit: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const where: Prisma.PostWhereInput = authorUserId ? { authorUserId } : {};

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        skip,
        take: limit,
        where,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async findOne(
    id: number,
  ): Promise<Prisma.PostGetPayload<{ include: { author: true } }>> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: {
        author: true,
      },
    });

    if (!post) {
      throw new NotFoundException(`Publicación con ID ${id} no encontrada`);
    }

    return post;
  }

  async update(id: number, updatePostDto: UpdatePostDto): Promise<Post> {
    await this.findOne(id); // Ensure it exists first

    return this.prisma.post.update({
      where: { id },
      data: updatePostDto,
    });
  }

  async remove(id: number): Promise<Post> {
    await this.findOne(id); // Ensure it exists first

    return this.prisma.post.delete({
      where: { id },
    });
  }
}
