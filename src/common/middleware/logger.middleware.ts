import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const requestId = randomUUID();
    req['reqId'] = requestId;

    res.setHeader('X-Request-Id', requestId);

    const { ip, method, originalUrl } = req;
    const userAgent = req.get('user-agent') || '';

    this.logger.log(
      `[REQ_ID: ${requestId}] Method: ${method}, URL: ${originalUrl} - IP: ${ip} - UA: ${userAgent}`,
    );

    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - start;

      this.logger.log(
        `[REQ_ID: ${requestId}] DONE ${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms`,
      );
    });

    res.on('error', (err) => {
      this.logger.error(
        `[REQ_ID: ${requestId}] ERRORED ${method} ${originalUrl} - ${err.message}`,
      );
    });

    next();
  }
}
