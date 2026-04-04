# Arquitectura inicial de SACE

## Principios
- `distributivo` es referencia funcional y fuente de migración, no dependencia de runtime.
- Toda lectura y escritura de datos pasa por `src/lib/repositorios`.
- Firebase Auth y Firestore se preparan desde el arranque, con fallback local para no bloquear UI.
- La identidad institucional se apoya en `cédula`, `correo` y `teléfono`.

## Identidad
- Login por correo y enlace mágico.
- Cédula obligatoria y normalizada a 10 dígitos.
- Teléfono ecuatoriano obligatorio de 10 dígitos.
- Admin semilla: `0201305406` / `xavymena@gmail.com`.

## Interfaz
- Dirección visual administrativa-editorial.
- Una superficie principal por página.
- Jerarquía por tipografía y espaciado.
- Tablas como núcleo del sistema.
