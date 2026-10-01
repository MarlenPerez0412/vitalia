# Sistema de diseno

Identidad VITALIA AgeTech: humana, cálida, moderna, tecnológica y accesible; no hospitalaria, no excesivamente corporativa, no infantil.

## Tokens (`src/styles/_tokens.scss`)

- **Marca** (`--vitalia-*`, valores de referencia exactos): teal `#118F88`, teal-dark `#0B5E5A`, turquesa `#39B8C7`, azul `#55B7E8`, suaves verde `#A8E4CE`, azul `#B7DCF4`, amarillo `#F4D875`, coral `#F49A86` y lila `#C9B6F3`; emergencia `#E54842` / `#C93431`; fondo `#F4FAF9`, superficie `#FFFFFF`, texto `#173B38` y texto atenuado `#637A77`.
- **Semánticos** (los que usan los componentes): derivados de la marca y ajustados para WCAG 2.2 AA (auditoría de contraste ≥4,5:1 para texto y ≥3:1 para bordes de controles; ver DECISIONS D012).
  - `--color-primary` `#0E7A74`, con hover en teal-dark;
  - `--color-secondary` `#137987`;
  - `--color-text-muted` `#566D6A`;
  - `--color-border-strong` `#7A9491`;
  - `--color-emergency` = `#C93431`, con `--color-emergency-bright` (`#E54842`) solo para decoración y texto grande;
  - `--color-text-on-tint` `#3D5451` para texto secundario sobre tintes.
- **Módulos Senior**: `--color-module-health` (coral), `-pensions` (amarillo), `-selfcare` (lila), `-security` (verde), `-entertainment` (azul) y `-family` (turquesa suave). Se usan como chip de icono y como tinte de fondo (`color-mix` al 38 % con blanco); el texto siempre va en `--color-text` o `--color-text-on-tint`.
- **LIA**: `--color-lia-start` / `--color-lia-end` (turquesa → azul) con texto `--color-lia-text` `#0B3A3F`.
- No repetir colores literales en componentes (salvo blancos translúcidos y los colores que Leaflet necesita en JS).

## Fundamentos

- Tipografia: pila nativa legible, base minima de 16 px, escala fluida con `clamp()` y altura de linea amplia.
- Espaciado: escala de 4, 8, 12, 16, 24, 32, 40, 48, 64 y 80 px.
- Bordes: radios de 12 a 24 px y pill; sombras suaves por nivel y foco turquesa visible.
- Layout: Grid/Flexbox, `minmax()`, `auto-fit/auto-fill` y `min-width: 0`; evitar anchos rigidos, superposiciones y overflow global.
- Breakpoints: XS 320-479, SM 480-767, MD 768-1023, LG 1024-1439, XL >=1440 px (validado hasta 1920).
- Accesibilidad: WCAG 2.2 AA como referencia; contraste, teclado, estados no dependientes solo del color, objetivos tactiles de 48 px y respeto a movimiento reducido.
- Presupuesto de estilos por componente: aviso a 8 kB y error a 12 kB (`angular.json`).

## Componentes implementados

- Primitives: `AppButton`, `StatusBadge`, `VitaliaIcon`, `CardShell`, `PageHeader` y `ResponsiveTable`. `ResponsiveTable` acepta un `cellTemplate` opcional (`let-row`, `let-column`, `let-value`) para acciones, checkboxes o badges; sin él muestra texto.
- Cards: Module, **ModuleTile**, Medication, Alert, Metric, Contact, User, Senior, CognitiveActivity e Insight.
  - `ModuleTile` (`app-module-tile`): toda la tarjeta es un único botón grande con icono protagonista y un color suave por módulo (`coral | yellow | lilac | green | blue | turquoise | teal`). Pensada para Senior, para no repetir tarjetas blancas idénticas.
- Estados: Empty, Loading y Error; accion critica `EmergencyButton`.
- Dialogos: `ConsentDialog`.
  - Es un sheet inferior en móvil y un modal centrado desde 768 px, con focus trap, Escape, retorno del foco y acciones de 48 px.
  - Admite contenido proyectado, `tone="danger"` y `customActions` con `[dialogActions]` (p. ej. el enlace `tel:` del diálogo de llamada).
- Navegacion: `Topbar`, `UserMenu`, `SeniorBottomNavigation`, `DesktopSidebar` y `MobileDrawer`.
  - `UserMenu` es el menú de cuenta del topbar: avatar o inicial, nombre, correo y rol, con Mi perfil, Configuración y Cerrar sesión. Se abre con click y se cierra con click fuera o Escape; flechas, Inicio y Fin recorren las opciones, devuelve el foco y es responsive. Lo creó otra sesión y en esta fase se amplió.
  - `SeniorBottomNavigation` admite un botón final «Más» (`moreLabel`, `aria-expanded`).
  - `MobileDrawer` admite `responsive=false` para usarse en todos los anchos (menú completo de Senior). Además ahora mueve el foco al abrir, lo atrapa y lo devuelve al cerrar, con scroll interno.
  - `DesktopSidebar` permite desplazar la lista cuando hay muchas secciones.
- Iconos (`VitaliaIcon`): se añadieron `wallet`, `play`, `settings`, `map-pin`, `chart`, `message`, `clipboard` y `lock` al registro interno.
- Formularios: clases globales `v-field`, `v-input` y `v-form-grid`.

## Componentes de feature destacados

- Senior:
  - `VoiceCommandBar`: activación, indicador «Comandos de voz activos» con su estado, Desactivar y avisos `aria-live`;
  - `VoiceCommandDialogs`;
  - `CallContactDialog`: llamada confirmada, sin llamadas silenciosas, con número visible y «Copiar número»;
  - `LocationCard`.
- Workspaces: `WorkspacePageComponent` (sección por configuración) y `AccountPageComponent` (Mi perfil y Configuración).

El showcase standalone vive en `shared/ui/showcase`; es referencia interna compilable y no tiene ruta de produccion. La iconografia usa exclusivamente el registro SVG interno `VitaliaIcon` con trazo consistente.
