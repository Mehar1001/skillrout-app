# Observability

## Present

- Cloud Functions use `firebase-functions/logger` for employee creation, OCR, visits, shift transitions, reconciliation, closure, and adjustments.
- Shift diagnostic logs include authenticated UID, owner, employee, shift, visit/store identifiers, and status; financial detail is generally avoided.
- Client screens and services use targeted `console.error`/`console.warn` messages.
- `firebase functions:log` is available as `npm run logs` in `functions/`.

## Missing

- No Sentry, Crashlytics, Datadog, New Relic, or OpenTelemetry integration.
- No application metrics, traces, alert policies, or tracked dashboards.
- No documented log retention/SLO/SLA policy.
- No cross-tier request correlation ID.
- No centralized browser/native error ingestion.

Provider console logs and local browser/device consoles are therefore the current diagnostic mechanisms.
