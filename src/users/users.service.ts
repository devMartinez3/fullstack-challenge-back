import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@pris/prisma.service';
import { User, Prisma } from '@pris/generated/prisma/client';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { UpdateUserDto } from './dto/update-user.dto';

export interface ReqResUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
  role: 'USER' | 'ADMIN';
}

export interface ReqResSingleResponse {
  data: ReqResUser;
}

export interface ReqResListResponse {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: ReqResUser[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async importUserFromReqRes(id: number): Promise<User> {
    const reqresUrl = this.configService.get<string>('REQRES_URL');
    const apiKey = this.configService.get<string>('SECRET_KEY');

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (existingUser) {
      throw new ConflictException(
        `El usuario con ID ${id} ya está guardado localmente`,
      );
    }

    const response = await firstValueFrom(
      this.httpService
        .get<ReqResSingleResponse>(`${reqresUrl}/users/${id}`, {
          headers: { 'x-api-key': apiKey },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(`Error fetching user ${id}: ${error.message}`);
            if (error.response?.status === 404) {
              throw new NotFoundException(
                `Usuario con ID ${id} no encontrado en ReqRes`,
              );
            }
            throw new InternalServerErrorException(
              'Error al comunicarse con ReqRes',
            );
          }),
        ),
    );

    const reqResUser = response.data.data;

    if (!reqResUser || !reqResUser.email) {
      throw new InternalServerErrorException(
        'La respuesta de ReqRes no contiene los datos del usuario esperados',
      );
    }

    const savedUser = await this.prisma.user.create({
      data: {
        id: reqResUser.id,
        email: reqResUser.email,
        firstName: reqResUser.first_name,
        lastName: reqResUser.last_name,
        avatar: reqResUser.avatar,
        role: id === 1 ? 'ADMIN' : 'USER',
      },
    });

    return savedUser;
  }

  async getSavedUsers(
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Prisma.UserGetPayload<{
      include: { _count: { select: { posts: true } } };
    }>[];
    meta: {
      total: number;
      page: number;
      lastPage: number;
      limit: number;
    };
  }> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
        limit,
      },
    };
  }

  async getSavedUserById(
    id: number,
  ): Promise<Prisma.UserGetPayload<{ include: { posts: true } }>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        posts: true,
      },
    });
    if (!user) {
      throw new NotFoundException(
        `Usuario guardado localmente con ID ${id} no encontrado`,
      );
    }
    return user;
  }

  async deleteSavedUser(id: number, adminId: number): Promise<User> {
    const adminUser = await this.getSavedUserById(adminId);
    if (!adminUser || adminUser.role !== 'ADMIN') {
      throw new ForbiddenException(
        'No tienes permisos suficientes para eliminar usuarios. Solo los administradores pueden realizar esta acción.',
      );
    }

    const user = await this.getSavedUserById(id);
    if (!user) {
      throw new NotFoundException(
        `Usuario guardado localmente con ID ${id} no encontrado`,
      );
    }
    await this.prisma.post.deleteMany({
      where: { authorUserId: id },
    });

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async updateSavedUser(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailExists) {
        throw new ConflictException(
          `El correo electrónico ${updateUserDto.email} ya está en uso por otro usuario`,
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async updateUserRole(
    id: number,
    role: 'USER' | 'ADMIN',
    adminId: number,
  ): Promise<User> {
    if (id === adminId && role === 'USER') {
      throw new ForbiddenException(
        'No puedes quitarte el rol de administrador a ti mismo. Pídeselo a otro administrador.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }
}
