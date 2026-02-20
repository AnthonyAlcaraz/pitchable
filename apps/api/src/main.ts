import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
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
  app.use(
    helmet({
      contentSecurityPolicy: process.env['NODE_ENV'] === 'production'
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'", 'wss:', 'https:'],
              fontSrc: ["'self'", 'data:'],
            },
          }
        : false,
    }),
  );
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

  // SPA collision middleware: routes where both SPA pages and API controllers
  // share the same prefix. Serves index.html for browser navigation (Accept:
  // text/html) so the React SPA handles routing, while API calls (fetch/XHR
  // with Accept: */*) pass through to NestJS controllers.
  if (process.env['NODE_ENV'] === 'production') {
    const spaIndexPath = join(__dirname, '..', '..', '..', 'web', 'dist', 'index.html');
    if (existsSync(spaIndexPath)) {
      const spaHtml = readFileSync(spaIndexPath, 'utf-8');
      const collisionPrefixes = ['/pitch-lens', '/pitch-briefs'];
      expressApp.use((req: { method: string; path: string; headers: Record<string, string> }, res: { setHeader: (k: string, v: string) => void; end: (body: string) => void }, next: () => void) => {
        if (req.method !== 'GET') return next();
        if (!(req.headers['accept'] || '').includes('text/html')) return next();
        const match = collisionPrefixes.some(p => req.path === p || req.path.startsWith(p + '/'));
        if (!match) return next();
        res.setHeader('Content-Type', 'text/html');
        res.end(spaHtml);
      });
    }
  }

  await app.listen(process.env['PORT'] || 3000);

  // Increase server timeout for long-running sync generation (quality agents + Opus)
  const httpServer = app.getHttpServer();
  httpServer.setTimeout(600_000);      // 10 min request timeout
  httpServer.keepAliveTimeout = 620_000; // slightly longer than setTimeout
  console.log('Server timeout set to 600s');
}
bootstrap();
