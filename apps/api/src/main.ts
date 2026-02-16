import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Required for Stripe webhook signature verification
  });

  // Trust first proxy hop so req.ip returns real client IP behind load balancer
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] || 'http://localhost:5173',
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Pitchable API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env['PORT'] || 3000);

  // Increase server timeout for long-running sync generation (quality agents + Opus)
  const httpServer = app.getHttpServer();
  httpServer.setTimeout(600_000);      // 10 min request timeout
  httpServer.keepAliveTimeout = 620_000; // slightly longer than setTimeout
  console.log('Server timeout set to 600s');
}
bootstrap();
