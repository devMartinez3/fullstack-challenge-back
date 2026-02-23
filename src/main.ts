import { NestFactory, HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  console.log('DATABASE_URL =>', process.env.DATABASE_URL);
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors(); // Frontend will need this
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strip out non-whitelisted params
      forbidNonWhitelisted: true, // throw if non-whitelisted params hit
      transform: true, // automatically transform payloads to DTO instances
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));

  const config = new DocumentBuilder()
    .setTitle('Fullstack Challenge API')
    .setDescription('The ReqRes proxy and Postgres DB API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs available at: http://localhost:${port}/api/docs`);
}
bootstrap().catch((err) => {
  console.error('Error starting server', err);
});
