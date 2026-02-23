import { Injectable } from '@nestjs/common';
import { PrismaService } from '@pris/prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async getStats() {
    const [totalUsers, totalPosts, latestUsers, recentPosts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.post.count(),
        this.prisma.user.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        }),
        this.prisma.post.findMany({
          take: 3,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            createdAt: true,
            author: { select: { firstName: true, lastName: true } },
          },
        }),
      ]);

    return {
      totalUsers,
      totalPosts,
      latestUsers,
      recentPosts,
    };
  }
}
