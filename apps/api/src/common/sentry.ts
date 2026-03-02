import * as Sentry from '@sentry/node';

const dsn = process.env['SENTRY_DSN'];

if (dsn) {
  const isProd = process.env['NODE_ENV'] === 'production';
  Sentry.init({
    dsn,
    environment: process.env['NODE_ENV'] || 'development',
    release: process.env['SENTRY_RELEASE'] || process.env['RAILWAY_GIT_COMMIT_SHA'] || '0.0.1',
    tracesSampleRate: isProd ? 0.1 : 1.0,
    sendDefaultPii: false, // No user emails in error reports
  });
}

export { Sentry };
