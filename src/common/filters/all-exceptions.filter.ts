import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        message = response;
      } else if (
        typeof response === 'object' &&
        response !== null &&
        'message' in response
      ) {
        const resObj = response as { message: string | string[] };
        message = Array.isArray(resObj.message)
          ? resObj.message[0]
          : resObj.message;
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `[UnhandledError] ${exception.message}`,
        exception.stack,
      );
      message = exception.message;
    }

    const responseBody = ApiResponseDto.error(message, httpStatus);

    httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
  }
}
