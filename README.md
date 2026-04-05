# SACE

Sistema Automatizado de Control Escolar.

## Stack base
- Next.js App Router
- TypeScript
- Tailwind CSS
- Firebase Auth
- Firestore
- React Hook Form
- Zod
- TanStack Table

## Comandos
```bash
npm run dev
npm run lint
npm run typecheck
npm run commit:rapido
```

## Commit automatico
```bash
npm run commit:rapido
python3 scripts/hacer_commit.py --dry-run
python3 scripts/hacer_commit.py "tu mensaje"
python3 scripts/hacer_commit.py --no-push
```

Por defecto el script detecta cambios, genera el mensaje del commit automaticamente y hace `push` de la rama actual.

## Variables de entorno
Usa `.env.example` como referencia para conectar Firebase y la URL pública local o de preview.

## Arranque funcional incluido
- layout editorial del panel
- login con enlace mágico preparado
- dashboard institucional
- módulo inicial de docentes
- validaciones de cédula, correo y teléfono
- admin semilla institucional
