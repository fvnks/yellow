# Deploy en Coolify

Repositorio: `https://github.com/fvnks/yellow`

## Configuración del recurso

1. En Coolify: **+ New → GitHub App / Repository** → seleccionar `fvnks/yellow`.
   - Si el repo es privado, conectá la integración de GitHub oficial de Coolify
     (Settings → GitHub App). No pegues tokens en el código ni en el chat.
2. Build pack: **Dockerfile** (Coolify lo detecta automáticamente).
3. Puerto a exponer: **3000**.

## Variables de entorno (app service)

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL **interna** de Postgres (`postgres://...@<host-internal>:5432/postgres`) |

La app y la base deben vivir en la **misma red interna de Coolify**; nunca uses la
URL pública para la app.

## Migraciones

El `CMD` del Dockerfile ejecuta en cada arranque:

```bash
npx prisma migrate deploy && npm start
```

`migrate deploy` aplica las migraciones pendientes de `prisma/migrations/`
sin resetear datos. Nuevas migraciones se agregan con `prisma migrate dev`
(conexión a una DB de desarrollo) y quedan versionadas en Git.

## Seguridad

- **No publiques los puertos de Postgres** (5432 ni mapeos auxiliares) en
  0.0.0.0. Usá solo la red interna de Coolify + firewall del proveedor (OVH).
- Rotá la contraseña de Postgres si alguna vez fue compartida.
- Los secretos viven en Coolify (Environment Variables) y en `.env` local
  (gitignored). Nunca en el repositorio.
