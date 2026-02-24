import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { UsersService } from './users.service';
import { PrismaService } from '@pris/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import {
  createMockPrisma,
  createMockHttpService,
  createMockConfigService,
} from '../test/mocks';

describe('UsersService', () => {
  let service: UsersService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockHttp: ReturnType<typeof createMockHttpService>;
  let mockConfig: ReturnType<typeof createMockConfigService>;

  beforeEach(async () => {
    mockPrisma = createMockPrisma();
    mockHttp = createMockHttpService();
    mockConfig = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('importUserFromReqRes', () => {
    it('should throw ConflictException when user already exists in DB', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'a@b.com',
      } as never);

      await expect(service.importUserFromReqRes(1)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.importUserFromReqRes(1)).rejects.toThrow(
        /ya está guardado localmente/,
      );
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when ReqRes returns 404', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const axiosError = new AxiosError(
        'Not found',
        '404',
        {} as any,
        {} as any,
        { status: 404 } as any,
      );
      mockHttp.get.mockReturnValue(throwError(() => axiosError) as never);

      const promise = service.importUserFromReqRes(99);
      await expect(promise).rejects.toThrow(NotFoundException);
      await expect(promise).rejects.toThrow(/no encontrado en ReqRes/);
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException when ReqRes returns non-404 error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const axiosError = new AxiosError(
        'Server error',
        '500',
        {} as any,
        {} as any,
        { status: 500 } as any,
      );
      mockHttp.get.mockReturnValue(throwError(() => axiosError) as never);

      const promise = service.importUserFromReqRes(2);
      await expect(promise).rejects.toThrow(InternalServerErrorException);
      await expect(promise).rejects.toThrow(/Error al comunicarse con ReqRes/);
    });

    it('should throw InternalServerErrorException when ReqRes response has no data or email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHttp.get.mockReturnValue(of({ data: { data: null } }) as never);

      await expect(service.importUserFromReqRes(2)).rejects.toThrow(
        InternalServerErrorException,
      );
      await expect(service.importUserFromReqRes(2)).rejects.toThrow(
        /no contiene los datos del usuario esperados/,
      );
    });

    it('should create user with ADMIN role when id is 1', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const reqResUser = {
        id: 1,
        email: 'admin@reqres.in',
        first_name: 'Admin',
        last_name: 'User',
        avatar: 'https://example.com/1.jpg',
      };
      mockHttp.get.mockReturnValue(
        of({ data: { data: reqResUser } }) as never,
      );
      const saved = {
        id: 1,
        email: reqResUser.email,
        firstName: reqResUser.first_name,
        lastName: reqResUser.last_name,
        avatar: reqResUser.avatar,
        role: 'ADMIN',
      };
      mockPrisma.user.create.mockResolvedValue(saved as never);

      const result = await service.importUserFromReqRes(1);

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          id: 1,
          email: reqResUser.email,
          firstName: reqResUser.first_name,
          lastName: reqResUser.last_name,
          avatar: reqResUser.avatar,
          role: 'ADMIN',
        },
      });
    });

    it('should create user with USER role when id is not 1', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const reqResUser = {
        id: 2,
        email: 'user@reqres.in',
        first_name: 'Jane',
        last_name: 'Doe',
        avatar: 'https://example.com/2.jpg',
      };
      mockHttp.get.mockReturnValue(
        of({ data: { data: reqResUser } }) as never,
      );
      const saved = { ...reqResUser, role: 'USER' };
      mockPrisma.user.create.mockResolvedValue(saved as never);

      const result = await service.importUserFromReqRes(2);

      expect(result.role).toBe('USER');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'USER' }),
        }),
      );
    });
  });

  describe('getSavedUsers', () => {
    it('should return paginated users with meta', async () => {
      const users = [
        {
          id: 1,
          email: 'a@b.com',
          firstName: 'A',
          lastName: 'B',
          _count: { posts: 2 },
        },
      ];
      mockPrisma.user.findMany.mockResolvedValue(users as never);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.getSavedUsers(1, 10);

      expect(result.data).toEqual(users);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        lastPage: 1,
        limit: 10,
      });
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should use correct skip for page 2', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.getSavedUsers(2, 5);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  describe('getSavedUserById', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getSavedUserById(99)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getSavedUserById(99)).rejects.toThrow(
        /no encontrado/,
      );
    });

    it('should return user with posts when found', async () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        posts: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(user as never);

      const result = await service.getSavedUserById(1);

      expect(result).toEqual(user);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { posts: true },
      });
    });
  });

  describe('deleteSavedUser', () => {
    it('should throw ForbiddenException when requester is not ADMIN', async () => {
      const nonAdmin = {
        id: 2,
        email: 'u@b.com',
        role: 'USER',
        posts: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(nonAdmin as never);

      await expect(service.deleteSavedUser(1, 2)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.deleteSavedUser(1, 2)).rejects.toThrow(
        /Solo los administradores/,
      );
      expect(mockPrisma.post.deleteMany).not.toHaveBeenCalled();
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user to delete does not exist', async () => {
      const admin = {
        id: 1,
        email: 'admin@b.com',
        role: 'ADMIN',
        posts: [],
      };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(admin as never)
        .mockResolvedValueOnce(null);

      await expect(service.deleteSavedUser(99, 1)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled();
    });

    it('should delete posts then user when admin deletes a user', async () => {
      const admin = {
        id: 1,
        email: 'admin@b.com',
        role: 'ADMIN',
        posts: [],
      };
      const toDelete = { id: 2, email: 'x@b.com', role: 'USER', posts: [] };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(admin as never)
        .mockResolvedValueOnce(toDelete as never);
      mockPrisma.post.deleteMany.mockResolvedValue({ count: 0 } as never);
      mockPrisma.user.delete.mockResolvedValue(toDelete as never);

      const result = await service.deleteSavedUser(2, 1);

      expect(result).toEqual(toDelete);
      expect(mockPrisma.post.deleteMany).toHaveBeenCalledWith({
        where: { authorUserId: 2 },
      });
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 2 },
      });
    });
  });

  describe('updateSavedUser', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateSavedUser(99, { firstName: 'New' }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new email is already used by another user', async () => {
      const user = {
        id: 1,
        email: 'old@b.com',
        firstName: 'A',
        lastName: 'B',
      };
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(user as never)
        .mockResolvedValueOnce({ id: 2, email: 'taken@b.com' } as never);

      const promise = service.updateSavedUser(1, { email: 'taken@b.com' });
      await expect(promise).rejects.toThrow(ConflictException);
      await expect(promise).rejects.toThrow(/ya está en uso/);
    });

    it('should update user when valid', async () => {
      const user = {
        id: 1,
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
      };
      const updated = { ...user, firstName: 'Updated' };
      mockPrisma.user.findUnique.mockResolvedValue(user as never);
      mockPrisma.user.update.mockResolvedValue(updated as never);

      const result = await service.updateSavedUser(1, { firstName: 'Updated' });

      expect(result).toEqual(updated);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { firstName: 'Updated' },
      });
    });
  });

  describe('updateUserRole', () => {
    it('should throw ForbiddenException when admin tries to remove own ADMIN role', async () => {
      const admin = {
        id: 1,
        email: 'admin@b.com',
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(admin as never);

      await expect(
        service.updateUserRole(1, 'USER', 1),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.updateUserRole(1, 'USER', 1),
      ).rejects.toThrow(/No puedes quitarte el rol/);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole(99, 'ADMIN', 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update role when valid', async () => {
      const user = { id: 2, email: 'u@b.com', role: 'USER' };
      const updated = { ...user, role: 'ADMIN' };
      mockPrisma.user.findUnique.mockResolvedValue(user as never);
      mockPrisma.user.update.mockResolvedValue(updated as never);

      const result = await service.updateUserRole(2, 'ADMIN', 1);

      expect(result.role).toBe('ADMIN');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { role: 'ADMIN' },
      });
    });
  });
});
