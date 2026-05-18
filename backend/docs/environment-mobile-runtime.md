# Environment Operational Runtime — Runtime — Mobile

## Âmbito

Runtime **operacional** SGA/EHS: água, efluentes, emissões, resíduos e campo — mobile-first, offline-first, scanner, evidências, eventos industriais.

## Superfícies

| Camada | Path |
|--------|------|
| API | `POST /api/environment-operational/events`, `POST .../workspace/:area/record` |
| Backend | `backend/src/domains/environment/operational/` |
| Frontend | `frontend/src/domains/environment/operational-runtime/` |

## Flags

- `IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED` (mestre)
- `IMPETUS_ENVIRONMENT_OFFLINE_RUNTIME_ENABLED`
- `IMPETUS_ENVIRONMENT_SCANNER_RUNTIME_ENABLED`
- `IMPETUS_ENVIRONMENT_REALTIME_RUNTIME_ENABLED`
- `IMPETUS_ENVIRONMENT_ATTACHMENT_RUNTIME_ENABLED`

Espelhar com `VITE_*` no cliente.

## Estado

**Enterprise Shadow Operational Environment Runtime** — sem FULL rollout.

## Testes

```bash
npm run test:environment-operational-runtime
npm run test:environment-operational-validation
```
