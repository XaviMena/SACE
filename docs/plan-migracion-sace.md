# Plan de migración funcional de SACE

## Propósito
- SACE es la reconstrucción moderna del sistema escolar anterior usado en APCH.
- La referencia funcional actual identificada en local es `/Users/xaviermena/Desktop/Programas/distributivo`.
- Asumo que `distributivo` representa la línea funcional de `gestion_apch` mencionada en conversación o su evolución directa.
- El objetivo no es copiar la interfaz vieja, sino preservar sus capacidades críticas y rehacerlas con la arquitectura actual de SACE: Next.js, Firebase Auth, Firestore y UI web.

## Estado actual de SACE
- Autenticación institucional con magic link y validación de perfil.
- Panel base con navegación lateral y protección de sesión.
- Dashboard institucional inicial.
- Módulo inicial de docentes.
- Repositorios base para `docentes`, `usuarios`, `periodos` y `asignaciones`.
- Semillas y fallback local para seguir desarrollando sin bloquear la UI.

## Estado actual documentado en código
- Acceso y sesión: [src/components/formularios/formulario-acceso.tsx](/Users/xaviermena/Desktop/Programas/SACE/src/components/formularios/formulario-acceso.tsx)
- Panel principal: [src/components/layout/panel-aplicacion.tsx](/Users/xaviermena/Desktop/Programas/SACE/src/components/layout/panel-aplicacion.tsx)
- Dashboard: [src/components/dashboard/modulo-dashboard.tsx](/Users/xaviermena/Desktop/Programas/SACE/src/components/dashboard/modulo-dashboard.tsx)
- Docentes: [src/components/docentes/modulo-docentes.tsx](/Users/xaviermena/Desktop/Programas/SACE/src/components/docentes/modulo-docentes.tsx)
- Base arquitectónica previa: [docs/arquitectura-inicial.md](/Users/xaviermena/Desktop/Programas/SACE/docs/arquitectura-inicial.md)

## Qué hace el sistema anterior
Del menú principal de `distributivo` se desprenden estos dominios funcionales:

### 1. Comunidad
- Docentes
- Estudiantes
- Campeonato interno

### 2. Oferta académica
- Niveles de educación
- Grados y cursos
- Paralelos
- Asignaturas
- Malla curricular

### 3. Operación lectiva
- Distributivo y asignación de carga
- Comisiones y actividades
- Horarios
- Año lectivo
- Depuración de duplicados

### 4. Evaluación y asistencia
- Horario y asistencia
- Evaluaciones
- Grupos de trabajo
- Actividades de tutoría
- Juegos y actividades auxiliares

### 5. Datos e integración
- Importación de nómina docente
- Importación de estructura institucional
- Importación y sincronización de malla
- Importación de distributivo
- Migración de optativas
- Descarga e importación de listas estudiantiles
- Importación y exportación de datos

### 6. Reportes
- Dashboard y estadísticas
- Reportes de distributivo
- Reportes docentes
- Reportes de estudiantes
- Reportes de calificaciones
- Impresión de matrícula
- Mensajería WhatsApp

### 7. Administración
- Usuarios
- Roles y permisos
- Auditoría
- Configuración general
- Backups
- Inicialización de periodo y base de datos

## Brecha entre el sistema anterior y SACE

### Ya cubierto o iniciado en SACE
- Login institucional
- Control de sesión
- Dashboard base
- Registro y consulta inicial de docentes
- Modelo de repositorios

### Aún no migrado en SACE
- Estudiantes
- Oferta académica completa
- Distributivo docente real
- Horarios
- Asistencia
- Evaluaciones y calificaciones
- Importadores institucionales
- Reportería formal
- Administración avanzada
- Mensajería y automatizaciones operativas

## Orden recomendado de migración
La recomendación no es migrar por archivo viejo, sino por dependencia funcional.

### Fase 1. Núcleo institucional
- Usuarios y perfiles institucionales
- Periodo lectivo activo
- Roles y permisos
- Catálogo base de docentes
- Catálogo base de estudiantes

Resultado esperado:
- SACE puede autenticar, identificar y autorizar usuarios correctamente.
- Existe estructura mínima para poblar el resto de módulos.

### Fase 2. Estructura académica
- Niveles de educación
- Grados y cursos
- Paralelos
- Asignaturas
- Malla curricular

Resultado esperado:
- Queda definida la oferta académica sobre la que se apoyan distributivo, estudiantes, horarios y reportes.

### Fase 3. Comunidad educativa
- Gestión completa de docentes
- Gestión completa de estudiantes
- Representantes o contactos si el modelo lo requiere

Resultado esperado:
- El sistema ya administra personas reales y puede relacionarlas con cursos, paralelos y periodos.

### Fase 4. Operación lectiva
- Distributivo o asignación de carga docente
- Comisiones y actividades
- Año lectivo
- Validaciones de consistencia

Resultado esperado:
- SACE deja de ser solo administrativo y empieza a operar la carga académica real.

### Fase 5. Ejecución académica
- Horarios
- Asistencia
- Tutorías
- Grupos de trabajo
- Evaluaciones
- Calificaciones

Resultado esperado:
- El sistema cubre la operación diaria del periodo académico.

### Fase 6. Integración y migración de datos
- Importación de nómina MINEDUC
- Importación de estructura
- Importación de listas CAS
- Sincronización de malla
- Exportaciones oficiales

Resultado esperado:
- SACE puede recibir y emitir información hacia los procesos reales del colegio y del MINEDUC.

### Fase 7. Reportes y analítica
- Dashboard ampliado
- Estadísticas docentes
- Reportes de carga
- Reportes estudiantiles
- Reportes de asistencia
- Reportes de calificaciones

Resultado esperado:
- Dirección, secretaría y coordinación pueden consultar y exportar información útil sin depender de procesos manuales.

## Módulos prioritarios para el siguiente bloque
Por dependencia, el mejor siguiente bloque no es “más UI”, sino estas piezas:

1. Modelo de estudiantes.
2. Catálogos de oferta académica: niveles, grados/cursos, paralelos y asignaturas.
3. Periodo lectivo y relaciones entre entidades.
4. Distributivo docente real.

## Propuesta de mapa de datos en SACE
Colecciones o dominios esperados en Firestore:
- `usuarios`
- `roles`
- `periodos`
- `docentes`
- `estudiantes`
- `niveles`
- `grados_cursos`
- `paralelos`
- `asignaturas`
- `malla_curricular`
- `asignaciones_docentes`
- `horarios`
- `asistencias`
- `evaluaciones`
- `calificaciones`
- `importaciones`
- `auditoria`

## Decisiones de migración ya claras
- El sistema nuevo será web, no PyQt.
- El patrón de acceso a datos en SACE debe mantenerse a través de `src/lib/repositorios`.
- Firebase Auth y Firestore siguen siendo la base prevista para autenticación y persistencia.
- La identidad institucional seguirá apoyándose en cédula, correo y teléfono, como ya quedó documentado.

## Riesgos y puntos de control
- El sistema viejo contiene muchos módulos auxiliares, experimentales o duplicados. No todos deben migrarse.
- Hay que distinguir entre módulos críticos de operación escolar y herramientas ocasionales.
- Algunas automatizaciones del sistema viejo dependen de Excel, SQLite, Selenium o flujos desktop; en SACE conviene reevaluarlas antes de reescribirlas.
- Conviene validar con el flujo real del colegio qué partes de `distributivo` siguen vigentes y cuáles fueron soluciones temporales.

## Siguiente paso recomendado
El siguiente entregable de análisis debería ser un inventario módulo por módulo con esta estructura:
- nombre del módulo antiguo
- objetivo funcional
- datos que consume
- datos que produce
- prioridad
- estado en SACE
- decisión: migrar, adaptar o descartar

## Próximo bloque de ejecución sugerido
1. Documentar el dominio de `estudiantes`.
2. Documentar el dominio de `oferta académica`.
3. Diseñar las colecciones y tipos TypeScript faltantes.
4. Implementar primero estudiantes y oferta académica base.
