import { NestFactory } from '@nestjs/core';
import { configure } from '@vendia/serverless-express';
import { AppModule } from './app.module';

let cachedServer: any;

export const handler = async (event: any, context: any) => {
  if (!cachedServer) {
    const nestApp = await NestFactory.create(AppModule);
    await nestApp.init();
    cachedServer = configure({ app: nestApp.getHttpAdapter().getInstance() });
  }
  return cachedServer(event, context);
};
