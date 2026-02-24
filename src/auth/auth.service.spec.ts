import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AxiosError } from 'axios';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@pris/prisma.service';
import {
  createMockPrisma,
  createMockHttpService,
  createMockConfigService,
} from '../test/mocks';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockHttp: ReturnType<typeof createMockHttpService>;
  let mockConfig: ReturnType<typeof createMockConfigService>;

  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, REQRES_URL: undefined };
    mockPrisma = createMockPrisma();
    mockHttp = createMockHttpService();
    mockConfig = createMockConfigService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: mockHttp },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw when REQRES_URL is not configured', async () => {
      const configWithoutUrl = createMockConfigService({ REQRES_URL: undefined });
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: HttpService, useValue: mockHttp },
          { provide: ConfigService, useValue: configWithoutUrl },
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();
      const authService = module.get<AuthService>(AuthService);

      await expect(
        authService.login({ email: 'a@b.com', password: 'p' }),
      ).rejects.toThrow('REQRES_URL is not configured');
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when ReqRes login fails', async () => {
      const axiosError = new AxiosError(
        'Request failed',
        '401',
        {} as any,
        {} as any,
        { status: 401 } as any,
      );
      mockHttp.post.mockReturnValue(throwError(() => axiosError));

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' }),
      ).rejects.toThrow(/Credenciales inválidas proporcionadas por ReqRes/);
    });

    it('should return token and user from DB when user exists locally', async () => {
      mockHttp.post.mockReturnValue(of({ data: { token: 'jwt-token' } }));
      const dbUser = {
        id: 1,
        email: 'a@b.com',
        firstName: 'John',
        lastName: 'Doe',
        avatar: null,
        role: 'ADMIN',
      };
      mockPrisma.user.findUnique.mockResolvedValue(dbUser as never);

      const result = await service.login({
        email: 'a@b.com',
        password: 'valid',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user).toEqual({
        id: 1,
        email: 'a@b.com',
        first_name: 'John',
        last_name: 'Doe',
        avatar: null,
        role: 'ADMIN',
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'a@b.com' },
      });
      expect(mockHttp.get).not.toHaveBeenCalled();
    });

    it('should return token and user from ReqRes (page 1) when not in DB', async () => {
      mockHttp.post.mockReturnValue(of({ data: { token: 'jwt-token' } }));
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const reqResUser = {
        id: 2,
        email: 'a@b.com',
        first_name: 'Jane',
        last_name: 'Doe',
        avatar: 'https://example.com/avatar.jpg',
        role: 'USER',
      };
      mockHttp.get.mockReturnValue(
        of({ data: { data: [reqResUser] } }) as never,
      );

      const result = await service.login({
        email: 'a@b.com',
        password: 'valid',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user).toEqual(reqResUser);
      expect(mockHttp.get).toHaveBeenCalledWith(
        expect.stringContaining('/users?page=1'),
        expect.objectContaining({ headers: expect.any(Object) }),
      );
    });

    it('should return token and user from ReqRes (page 2) when not on page 1', async () => {
      mockHttp.post.mockReturnValue(of({ data: { token: 'jwt-token' } }));
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHttp.get.mockImplementation((url: string) => {
        if (url.includes('page=1')) {
          return of({ data: { data: [] } }) as never;
        }
        return of({
          data: {
            data: [
              {
                id: 3,
                email: 'a@b.com',
                first_name: 'Page',
                last_name: 'Two',
                avatar: null,
                role: 'USER',
              },
            ],
          },
        }) as never;
      });

      const result = await service.login({
        email: 'a@b.com',
        password: 'valid',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user.email).toBe('a@b.com');
      expect(result.user.first_name).toBe('Page');
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should return token and fallback user when user not in DB or ReqRes', async () => {
      mockHttp.post.mockReturnValue(of({ data: { token: 'jwt-token' } }));
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockHttp.get.mockReturnValue(of({ data: { data: [] } }) as never);

      const result = await service.login({
        email: 'unknown@example.com',
        password: 'valid',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user).toEqual({
        id: 0,
        email: 'unknown@example.com',
        first_name: 'unknown',
        last_name: '',
        avatar: 'https://reqres.in/img/faces/1-image.jpg',
        role: 'USER',
      });
    });

    it('should return token and fallback user when fetching user details throws', async () => {
      mockHttp.post.mockReturnValue(of({ data: { token: 'jwt-token' } }));
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB error'));

      const result = await service.login({
        email: 'a@b.com',
        password: 'valid',
      });

      expect(result.token).toBe('jwt-token');
      expect(result.user).toMatchObject({ role: 'USER', id: 0 });
    });

    it('should rethrow when outer login flow throws non-Unauthorized error', async () => {
      mockHttp.post.mockReturnValue(of({ data: null }) as never);

      await expect(
        service.login({ email: 'a@b.com', password: 'p' }),
      ).rejects.toThrow(TypeError);
    });
  });
});
