# Phase Z.0 — Runtime Observation — Auditoria

**Data:** 2026-05-20  
**Tipo:** Estabilização operacional supervisionada (não é nova foundation cognitiva)

## Problemas observados em produção

| Sintoma | Severidade |
|---------|------------|
| RH vendo SST operacional / Emissões | CRITICAL |
| Módulos executivos em perfis operacionais | HIGH |
| Módulos shared excessivos (`operational`) | HIGH |
| Área funcional indefinida | MEDIUM |
| Summaries genéricos | MEDIUM |

## Mitigação Z.0

- **OBSERVAR** via `/api/internal/runtime-observation/*`
- **NÃO** bloquear, ocultar ou filtrar automaticamente
- Flags enforcement **OFF**; observabilidade **ON**

## Eventos

- `CONTEXTUAL_DELIVERY_LEAKAGE_DETECTED`
- `HIERARCHY_MISMATCH_DETECTED`
- `INCOMPLETE_OPERATIONAL_IDENTITY`
- `DASHBOARD_GENERICITY_DETECTED`

## Rollback

Desactivar flags Z.0 → `pm2 reload impetus-backend --update-env` (supervisionado, nunca `restart all`)
