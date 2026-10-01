# Contratos API futuros

Base prevista: `/api/v1`; JSON, UTC ISO 8601, paginacion por cursor y errores `{ code, message, details?, traceId }`. Autenticacion futura con JWT de corta duracion y renovacion segura.

- `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /me`.
- `GET|PATCH /users/{id}` y perfiles `/seniors`, `/caregivers`, `/health-professionals`.
- `GET|POST /medications`; `GET|POST /medications/{id}/schedules`; `POST /medication-intakes`.
- `GET|POST /wellbeing-checkins` y `GET /seniors/{id}/wellbeing-summary`.
- `GET|POST /alerts`; `PATCH /alerts/{id}`; `POST /emergencies`; `PATCH /emergencies/{id}`.
- `POST /locations`, `GET /seniors/{id}/locations/latest` sujeto a consentimiento.
- `GET /cognitive-activities`, `POST /cognitive-activities/{id}/progress`.
- `GET /audit-logs` restringido y paginado.

Son contratos de orientacion, no una API implementada. Idempotencia, rate limits, versionado y permisos se concretaran antes del backend.

