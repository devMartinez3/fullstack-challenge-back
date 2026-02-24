import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@pris/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly reqresUrl = process.env.REQRES_URL;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;
    const apiKey = this.configService.get<string>('SECRET_KEY');
    const baseUrl = this.reqresUrl || this.configService.get<string>('REQRES_URL');

    if (!baseUrl) {
      this.logger.error('REQRES_URL is not set');
      throw new Error('REQRES_URL is not configured');
    }

    try {
      const loginResponse = await firstValueFrom(
      this.httpService
        .post<{
          token: string;
        }>(
          `${baseUrl}/login`,
          { email, password },
          { headers: { 'x-api-key': apiKey }, timeout: 4000 },
        )
        .pipe(
          catchError((error: AxiosError) => {
            const status = error.response?.status;
            const code = error.code || 'UNKNOWN';
            this.logger.error(
              `ReqRes login failed: ${error.message} | code=${code} | status=${status} | url=${baseUrl}/login`,
              (error.response?.data ? JSON.stringify(error.response.data) : error.stack) ?? '',
            );
            throw new UnauthorizedException(
              'Credenciales inválidas proporcionadas por ReqRes',
            );
          }),
        ),
    );

    let matchedUser: any = null;

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (dbUser) {
        matchedUser = {
          id: dbUser.id,
          email: dbUser.email,
          first_name: dbUser.firstName,
          last_name: dbUser.lastName,
          avatar: dbUser.avatar,
          role: dbUser.role,
        };
      } else {
        const usersResponse = await firstValueFrom(
          this.httpService.get<{ data: any[] }>(
            `${baseUrl}/users?page=1`,
            {
              headers: { 'x-api-key': apiKey },
            },
          ),
        );
        matchedUser = usersResponse.data.data.find((u) => u.email === email);

        if (!matchedUser) {
          const usersResponsePage2 = await firstValueFrom(
            this.httpService.get<{ data: any[] }>(
              `${baseUrl}/users?page=2`,
              {
                headers: { 'x-api-key': apiKey },
              },
            ),
          );
          matchedUser = usersResponsePage2.data.data.find(
            (u) => u.email === email,
          );
        }
      }
    } catch (e) {
      this.logger.error(
        'Error fetching user details after login',
        e instanceof Error ? e.stack : String(e),
      );
    }

    if (!matchedUser) {
      matchedUser = {
        id: 0,
        email: email,
        first_name: email.split('@')[0],
        last_name: '',
        avatar: 'https://reqres.in/img/faces/1-image.jpg',
        role: 'USER',
      };
    }

    return {
      token: loginResponse.data.token,
      user: matchedUser,
    };
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.error(
        'Login unexpected error',
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
