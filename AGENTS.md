# VITALIA - reglas para agentes

Antes de modificar codigo, leer este archivo y los documentos de `docs/` relacionados con la tarea.

- Respetar la arquitectura y las decisiones registradas; cambiarlas solo cuando exista una necesidad comprobable.
- Reutilizar componentes y no duplicar modelos, servicios ni logica.
- Mantener una experiencia mobile-first y funcional desde 320 px, con accesibilidad WCAG 2.2 AA como referencia.
- No introducir backend, IA, notificaciones ni integraciones medicas reales sin una instruccion explicita.
- Usar inicialmente los mocks centralizados de `core/services`.
- No eliminar codigo funcional sin justificarlo.
- Antes de finalizar, ejecutar `npm run build` y corregir errores de TypeScript y routing.
- Actualizar `docs/STATUS.md` al terminar cada tarea.
- Actualizar `docs/DECISIONS.md` solo cuando se adopte una nueva decision arquitectonica.
- Responder de forma breve e indicar validaciones y pendientes.

