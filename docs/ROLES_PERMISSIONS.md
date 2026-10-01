# Roles y permisos

| Rol | Alcance inicial | Inicio |
| --- | --- | --- |
| `SENIOR` | Gestionar su perfil, bienestar, medicación y actividades; controlar consentimientos, alertas y emergencias. | `/senior` |
| `CAREGIVER` | Ver la información compartida, el acompañamiento, las alertas y las emergencias de las personas vinculadas. | `/care` |
| `HEALTH` | Consultar datos clínicamente relevantes y autorizados, y registrar seguimiento profesional (sin expediente clínico completo). | `/health` |
| `ADMIN` | Gestionar usuarios, roles, permisos, configuración y auditoría; sin acceso clínico indiscriminado. | `/admin` |
| `INSTITUTION` | Futuro: administrar equipos, sedes y poblaciones con permisos delegados. Sin navegación todavía. | — |

La autorización también debe validarse en el backend futuro. El mínimo privilegio, el consentimiento y la auditoría prevalecen sobre el rol.

## Control de acceso en el frontend

- `roleGuard` (`core/guards/role.guard.ts`) protege cada área por `data.roles`. Sin sesión redirige a `/login?returnUrl=…`; con otro rol redirige al inicio de ese rol.
- `guestGuard` (`core/guards/guest.guard.ts`) evita volver a `/login` con sesión activa.
- `AuthService` guarda en `localStorage` solo el id opaco de la sesión (`vitalia.mock-user`). La verificación de credenciales vive en `AuthBackend` (`core/auth/auth-backend.ts`); hoy la implementa `MockAuthBackend` y se sustituirá por Supabase Auth.

## Cuentas de demostración

Contraseña común: `vitalia2026`. También se puede entrar sin credenciales desde «Entrar en modo demostración».

| Rol | Correo | Nombre |
| --- | --- | --- |
| `SENIOR` | `maria@demo.vitalia.mx` | María Hernández |
| `CAREGIVER` | `ana@demo.vitalia.mx` | Ana Hernández (hija y contacto de emergencia de María) |
| `HEALTH` | `salud@demo.vitalia.mx` | Dr. Ruiz |
| `ADMIN` | `admin@demo.vitalia.mx` | Administracion VITALIA |

## Catálogo de permisos (`core/models/access.models.ts`)

| Código | Permiso | SENIOR | CAREGIVER | HEALTH | ADMIN |
| --- | --- | :-: | :-: | :-: | :-: |
| `VIEW_OWN_MEDICATIONS` | Ver sus medicamentos | ✓ | | | |
| `RECORD_MEDICATION_INTAKE` | Registrar tomas | ✓ | | | |
| `VIEW_AUTHORIZED_MEDICATIONS` | Ver medicamentos autorizados | | ✓ | ✓ | |
| `VIEW_WELLBEING` | Ver bienestar | ✓ | ✓ | ✓ | |
| `VIEW_COGNITION` | Ver cognición | ✓ | ✓ | ✓ | |
| `VIEW_LOCATION` | Ver ubicación (con consentimiento) | ✓ | ✓ | | |
| `TRIGGER_EMERGENCY` | Solicitar ayuda | ✓ | | | |
| `VIEW_EMERGENCY` | Ver emergencias | ✓ | ✓ | | |
| `VIEW_REPORTS` | Ver reportes | | ✓ | ✓ | |
| `MANAGE_USERS` | Gestionar usuarios | | | | ✓ |
| `MANAGE_ROLES` | Gestionar roles | | | | ✓ |
| `MANAGE_PERMISSIONS` | Gestionar permisos | | | | ✓ (protegido) |
| `VIEW_AUDIT` | Ver auditoría | | | | ✓ |

La matriz por defecto es `DEFAULT_ROLE_PERMISSIONS`. En `/admin/permissions` se edita en memoria mediante `AdminDirectoryService`. `MANAGE_PERMISSIONS` de ADMIN no puede retirarse y el rol ADMIN no puede desactivarse, para no perder el acceso a la administración. Cada cambio queda en la auditoría de la sesión. Todavía no se aplica a la navegación: el control efectivo sigue siendo por rol y lo hará el backend.
