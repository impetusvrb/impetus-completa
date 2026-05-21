# Phase Z.9 — Summary Runtime Activation

## Objectivo

Primeira activação **supervisionada** do canal `summary` no runtime narrativo IMPETUS, com `execute=true` e `approved_by` obrigatórios.

## Flags (defeito)

| Flag | Defeito |
|------|---------|
| `IMPETUS_SUMMARY_RUNTIME_ACTIVATION` | OFF |
| `IMPETUS_TENANT_SUMMARY_ENFORCEMENT` | OFF |
| `IMPETUS_SUMMARY_NARRATIVE_STABILIZATION` | OFF |
| `IMPETUS_SUMMARY_TARGETING_HARDENING` | OFF |
| `IMPETUS_SUMMARY_DELIVERY_QUALITY` | OFF |
| `IMPETUS_SUMMARY_RUNTIME_OBSERVABILITY` | ON |

**Chat:** continua OFF.

## Rollout supervisionado

1. Piloto com `menu` + `kpi` activos e `summary_snapshot` registado.
2. `GET /api/internal/summary-runtime-activation/readiness`
3. Simulação (`simulate_only: true`) opcional.
4. `POST /api/internal/summary-runtime-activation/activate/:tenant` com `execute=true` e `approved_by`.
5. Observar `GET /dashboard/smart-summary` → blocos `summary_runtime_activation`, `summary_delivery_quality`, `summary_runtime_health`.

## Alteração de texto

- Texto **intacto** por defeito (shadow-first).
- Só altera com: piloto + flags ON + canal `summary` + rollback readiness válido.
- Acções permitidas: remoção de frases cross-domain (targeting) ou restauro de `summary_snapshot` (sem fabricação).

## Rollback

`POST /api/internal/summary-runtime-activation/rollback/:tenant` com `execute=true` e `approved_by`.

Desactiva canal `summary`; devolve metadados de snapshot; preserva `menu` e `kpi`.

## PM2

```bash
pm2 reload impetus-backend --update-env
```

## Roadmap pós-summary

- Chat enforcement (fase futura, separada).
- Expansão multi-tenant após métricas de observabilidade Z.9.
