import type * as SentryTypes from '@sentry/node';

let Sentry: typeof SentryTypes | null = null;

// Only load the heavy Sentry SDK when DSN is configured.
// Sentry v10 pulls in the entire OpenTelemetry stack (~200 packages),
// so skip the require entirely when not needed.
const dsn = process.env['SENTRY_DSN'];
if (dsn) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const SentryModule = require('@sentry/node') as typeof SentryTypes;
    const isProd = process.env['NODE_ENV'] === 'production';
    SentryModule.init({
      dsn,
      environment: process.env['NODE_ENV'] || 'development',
      release: process.env['SENTRY_RELEASE'] || process.env['RAILWAY_GIT_COMMIT_SHA'] || '0.0.1',
      tracesSampleRate: isProd ? 0.1 : 1.0,
      sendDefaultPii: false,
    });
    Sentry = SentryModule;
  } catch {
    // Sentry not available — continue without error monitoring
  }
}

export { Sentry };
