# Modelo de datos inicial

Los contratos TypeScript viven en `src/app/core/models/domain.models.ts`.

- `User`: identidad, rol, estado y preferencias basicas.
- `Role`, `Permission`: autorizacion por rol y capacidad.
- `SeniorProfile`, `CaregiverProfile`, `HealthProfessionalProfile`: datos propios y relaciones autorizadas.
- `Medication`, `MedicationSchedule`, `MedicationIntake`: tratamiento, pauta y registro de toma.
- `WellbeingCheckin`: auto-reporte de estado fisico y emocional.
- `Alert`, `EmergencyEvent`: senal accionable e incidente urgente con ciclo de vida.
- `LocationRecord`: ubicacion consentida, temporal y con precision explicita.
- `CognitiveActivity`: actividad, dificultad y progreso.
- `AuditLog`: actor, accion, recurso, fecha y metadatos trazables.

Los IDs se modelan como cadenas opacas y las fechas como ISO 8601. Los datos sensibles deben minimizarse y contar con reglas de retencion.

