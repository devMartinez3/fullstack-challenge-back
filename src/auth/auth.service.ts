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

    // Using RxJS firstValueFrom to convert the observable to a Promise
    const loginResponse = await firstValueFrom(
      this.httpService
        .post<{
          token: string;
        }>(
          `${this.reqresUrl}/login`,
          { email, password },
          { headers: { 'x-api-key': apiKey } },
        )
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(
              `Error from ReqRes: ${error.message}`,
              error.stack,
            );
            throw new UnauthorizedException(
              'Credenciales inválidas proporcionadas por ReqRes',
            );
          }),
        ),
    );

    // After successful login, we need to fetch user details to send to the frontend
    // We first check our local database to get the real 'role'
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
          role: dbUser.role, // Important!
        };
      } else {
        // Since ReqRes doesn't return user details on login, we'll try to find the user in the users list
        // First page
        const usersResponse = await firstValueFrom(
          this.httpService.get<{ data: any[] }>(
            `${this.reqresUrl}/users?page=1`,
            {
              headers: { 'x-api-key': apiKey },
            },
          ),
        );
        matchedUser = usersResponse.data.data.find((u) => u.email === email);

        // Second page if not found
        if (!matchedUser) {
          const usersResponsePage2 = await firstValueFrom(
            this.httpService.get<{ data: any[] }>(
              `${this.reqresUrl}/users?page=2`,
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
      this.logger.error('Error fetching user details after login');
    }

    if (!matchedUser) {
      // Fallback data if user not found in the first two pages
      matchedUser = {
        id: 0,
        email: email,
        first_name: email.split('@')[0],
        last_name: '',
        avatar: 'https://reqres.in/img/faces/1-image.jpg',
        role: 'USER', // Default fallback
      };
    }

    return {
      token: loginResponse.data.token,
      user: matchedUser,
    };
  }
}
