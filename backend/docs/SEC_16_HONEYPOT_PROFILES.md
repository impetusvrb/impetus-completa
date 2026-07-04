# SEC-16 — Honeypot Profiles

## Perfis certificados (modelos only)

| Perfil | Decoy path | Risco |
|--------|------------|-------|
| `fake_env` | `/.env.decoy` | HIGH |
| `fake_git` | `/.git/HEAD.decoy` | HIGH |
| `fake_backup` | `/backup/db.sql.decoy` | MEDIUM |
| `fake_api` | `/api/internal/v2/decoy` | MEDIUM |
| `fake_admin` | `/admin/decoy/login` | HIGH |
| `fake_config` | `/config/app.yml.decoy` | MEDIUM |
| `fake_upload` | `/uploads/decoy/upload` | MEDIUM |
| `fake_database` | `/db/export.decoy.sql` | HIGH |

## Regras

- `physicalResource: false` — nenhum ficheiro existe
- `deployed: false` — nunca publicado nesta fase
- `certified: true` — pronto para activação futura controlada

## Ficheiro

`backend/src/securityThreatDeception/engine/honeypotProfileService.js`
