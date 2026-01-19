# Sentry Setup

Sentry is configured for error monitoring in CMC Go.

## Where it initializes

- Server entrypoint initializes Sentry first: `server/_core/index.ts`
- Sentry implementation: `server/_core/sentry.ts`
- Error handling utilities (PII sanitization): `server/_core/errorHandler.ts`

## Configuration

- Set `SENTRY_DSN` for the backend.
- Set `VITE_SENTRY_DSN` for the frontend (if/when used).

If `SENTRY_DSN` is missing, the app should continue running but will log that Sentry is not configured.

## Verify

1. Deploy with `SENTRY_DSN` set.
2. Trigger a controlled error.
3. Confirm the issue appears in Sentry.
