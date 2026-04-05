<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Reglas de Dominio Escolar SACE

## Referencia funcional legacy
- SACE se construye como migración funcional del sistema anterior ubicado en `/Users/xaviermena/Desktop/Programas/distributivo`.
- Antes de inventar un módulo, flujo o colección nueva, verificar si ya existe equivalente funcional en `distributivo`, `gestion_apch` o en `Distributivo.db`.
- El menú funcional de referencia del sistema anterior se organiza en: Comunidad, Oferta académica, Operación lectiva, Evaluación y asistencia, Datos e integración, Reportes y Administración.

## Orden institucional de jornadas, cursos y paralelos
- NUNCA usar orden alfabético simple para jornadas, niveles, grados, cursos, paralelos o listados de estudiantes.
- El orden correcto debe seguir la lógica institucional ecuatoriana del archivo legacy `/Users/xaviermena/Desktop/Programas/distributivo/utils_ordenamiento.py`.
- En SACE se debe reutilizar la utilidad equivalente local `src/lib/utils/ordenamiento.ts`.
- El orden base es:
  - Jornada: Matutina -> Vespertina -> Nocturna -> Otras
  - Nivel académico: Inicial -> EGB -> BGU -> Otros
  - Paralelo: A -> B -> C -> ...
- Si un listado académico requiere ordenamiento, preferir `obtener_clave_orden_completa()` o comparadores centralizados, no lambdas ad hoc repetidas.

## Reglas de datos
- Cédulas, correos y teléfonos deben normalizarse antes de guardar o comparar.
- El periodo lectivo activo es referencia operativa para dashboard, asignaciones, reportes y filtros.
- Las importaciones desde `Distributivo.db` deben ser conservadoras: `upsert`, sin borrado masivo por defecto, con advertencias y progreso visible.

## Roles y acceso
- `Dashboard` y módulos de `Administración` son solo para usuarios `admin`.
- La autenticación por magic link no equivale a autorización.
- Un docente autenticado solo puede entrar cuando su estado institucional sea `activo`.

## Rendimiento
- No cargar listados completos cuando solo se necesitan conteos o KPIs.
- Para paneles administrativos y dashboard, preferir agregados server-side y consultas resumidas.
- Evitar lecturas masivas de Firestore en cliente si el dato puede resumirse en backend.

## Mensajes para usuario
- Los textos visibles para usuarios finales deben sonar institucionales, claros y naturales; no mostrar detalles técnicos, nombres de servicios, estados internos, fuentes de datos ni mensajes pensados para desarrollo.
- Solo mostrar mensajes técnicos o de diagnóstico cuando se esté realizando debug de forma explícita o en vistas internas de administración técnica.
