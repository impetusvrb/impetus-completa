# IMPETUS — Governance Production Rollout Playbook (Etapa Final C)

## Princípios

- Activacao **manual**, **auditavel**, **gated**, **reversivel**
- **Nunca** activar todos os canais ou todos os tenants de uma vez
- Shadow **ON**, Failsafe **ON** em todo o rollout
- **Sem** rollback automatico

## Pre-requisitos

1. Etapa Final A/B concluida: `GET /api/internal/governance/final/report?force=1`
2. `governance_health` >= 85, `production_status` >= `production_candidate`
3. Flags de canal **OFF** no env (promocao via runtime)
4. Backup do `.env` / ecosystem PM2

## Feature flags Etapa C (default OFF)

```
IMPETUS_PRODUCTION_ROLLOUT=off
IMPETUS_GOVERNANCE_STABILIZATION=off
IMPETUS_RUNTIME_OBSERVATION=off
```

## Sequencia de activacao (obrigatoria)

| Passo | Canal | Flag env (nao usar ON global) |
|-------|-------|-------------------------------|
| 1 | KPI | `IMPETUS_KPI_GOVERNANCE` |
| 2 | Summary | `IMPETUS_SUMMARY_GOVERNANCE` |
| 3 | Chat | `IMPETUS_CHAT_GOVERNANCE` |
| 4 | Boundary | `IMPETUS_COGNITIVE_BOUNDARY_GUARD` |

**7 dias** de observacao shadow entre cada passo.

## Fase 1 — Framework

```bash
IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=on
IMPETUS_PRODUCTION_ROLLOUT=on
IMPETUS_GOVERNANCE_STABILIZATION=on
IMPETUS_RUNTIME_OBSERVATION=on
pm2 reload impetus-backend --update-env
```

Verificar: `GET /api/internal/governance/production/status?force=1`

## Fase 2 — Validacao pre-rollout

```bash
GET /api/internal/governance/production/validate?force=1
GET /api/internal/governance/production/deploy-check?skip_build=1
GET /api/internal/governance/production/rollback-verify
```

## Fase 3 — Promocao por canal (manual)

```http
POST /api/internal/governance/production/promote/kpi
Content-Type: application/json

{
  "execute": true,
  "approved_by": "<operator_id>"
}
```

Repetir para `summary`, `chat`, `boundary` **apenas apos** passo anterior validado.

Alternativa (Fase I directa): `POST /api/internal/governance/activate/:channel` com mesmos gates.

## Fase 4 — Observacao

```bash
GET /api/internal/governance/production/observe?force=1
GET /api/internal/governance/production/tuning
POST /api/internal/governance/production/supervise
```

Logs esperados:
- `PRODUCTION_GOVERNANCE_OBSERVATION`
- `PRODUCTION_GOVERNANCE_STABLE` / `PRODUCTION_GOVERNANCE_DEGRADED`
- `PRODUCTION_ACTIVATION_VALIDATED`

## Rollout tenant-safe

```http
POST /api/internal/governance/production/promote/kpi
{ "execute": true, "tenant_id": "tenant-xyz", "approved_by": "..." }
```

Requer `IMPETUS_TENANT_SAFE_GOVERNANCE=on`. Um tenant de cada vez.

## Rollback supervisionado

1. `POST /api/internal/governance/production/demote/:channel` (por canal)
2. Ou `POST .../activation/rollback-rollout` (Fase I)
3. Flags off:

```bash
IMPETUS_PRODUCTION_ROLLOUT=off
IMPETUS_GOVERNANCE_STABILIZATION=off
IMPETUS_RUNTIME_OBSERVATION=off
IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION=off
IMPETUS_KPI_GOVERNANCE=off
IMPETUS_SUMMARY_GOVERNANCE=off
IMPETUS_CHAT_GOVERNANCE=off
IMPETUS_COGNITIVE_BOUNDARY_GUARD=off
pm2 reload impetus-backend --update-env
```

## Emergencia

`POST /api/internal/governance/operations/emergency/prepare` (Fase J) — plano apenas, execucao manual.

## PM2 reload sequencing

Ver `GET /api/internal/governance/production/reload-plan`:
1. Verificar env
2. Backup
3. `pm2 reload impetus-backend --update-env`
4. Health check
5. 7d shadow observation

## Migracoes e build

- Completar migracoes **antes** do rollout
- `frontend/dist` verificado em deploy-check (ou `skip_build=1` em staging)
- Sem rebuild obrigatorio para rollback de flags

## API Etapa C

| Metodo | Path |
|--------|------|
| GET | `/production/status` |
| GET | `/production/sequence` |
| GET | `/production/validate` |
| GET | `/production/deploy-check` |
| GET | `/production/observe` |
| GET | `/production/rollback-verify` |
| GET | `/production/runbook` |
| GET | `/production/reload-plan` |
| GET | `/production/tuning` |
| POST | `/production/promote/:channel` |
| POST | `/production/demote/:channel` |
| POST | `/production/supervise` |

## Testes

```bash
npm run test:production-governance-rollout
```

## Pos-rollout

O foco passa de **implementacao** para **operacao supervisionada continua**:
- Observacao diaria via `/production/observe`
- Incidentes via Fase J (sem auto-remediacao)
- Revisao semanal via `/final/report`
