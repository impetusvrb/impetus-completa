# Primeiro Deploy Operacional — Shadow + Observability Bootstrap

## O que este deploy É

- Infraestrutura de governança **online** em modo observação
- Shadow global + telemetria + audit + readiness + incident engine
- Recolha massiva de divergência **sem** hard enforcement

## O que este deploy NÃO É

- Governança total activada
- Hard deny / boundary lock
- Activacao automatica de chat/summary/boundary

## Comandos

```bash
# Auditar + dry-run
npm run governance:bootstrap-deploy:dry

# Deploy supervisionado (backup + flags + build + pm2)
npm run governance:bootstrap-deploy

# Testes
npm run test:governance-production-bootstrap
```

## API pós-deploy (interna)

| GET | `/api/internal/governance/bootstrap/status` |
| GET | `/api/internal/governance/bootstrap/report` |
| GET | `/api/internal/governance/bootstrap/soft-kpi` |
| POST | `/api/internal/governance/bootstrap/observe/start` |

## Soft KPI (Etapa 8)

Apenas se metricas estaveis — avaliar via `GET .../bootstrap/soft-kpi`.

Se `safe: true`, activar manualmente:

```bash
IMPETUS_KPI_GOVERNANCE=on
# ou POST /api/internal/governance/production/promote/kpi com execute:true
pm2 reload impetus-backend --update-env
```

## Rollback

```bash
# Remover bloco GOVERNANCE_PRODUCTION_BOOTSTRAP do .env
# + canais off
pm2 reload impetus-backend --update-env
```

Backup em `backend/backups/governance-production-bootstrap-YYYYMMDD/`.

## Documentos gerados pelo script

- `docs/pre-production-governance-audit.md`
- `docs/runtime-governance-entrypoint-map.md`
- `docs/governance-production-bootstrap-report.md`
