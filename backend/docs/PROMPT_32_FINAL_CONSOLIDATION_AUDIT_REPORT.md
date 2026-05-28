# PROMPT 32 — Auditoria Final de Consolidação

**Data:** 2026-05-28  
**Fase:** Consolidação enterprise / industrial-grade  
**Estado:** `on` — avaliação read-only + snapshots

## Objetivo

Validar se o IMPETUS deixou de ser shadow-first eterno / pilot fictício / runtime só observativo e se tornou **enterprise-grade**, **governado**, **auditável** e **comercializável**.

Gerar:

1. **maturity_score_final**
2. **architecture_score**
3. **governance_score**
4. **ai_safety_score**
5. **industrial_readiness_score**
6. **international_readiness_score**
7. **certification_readiness_score**

Mais: relatório executivo, riscos remanescentes, débito residual, roadmap residual, classificação final.

## Flags

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_FINAL_CONSOLIDATION_AUDIT_ENABLED` | `true` | Activa motor |

**Rollback:** `MODE=off` + `pm2 reload impetus-backend --update-env`.

## Rotas API

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/final-consolidation-audit/health` | auth |
| GET | `/api/final-consolidation-audit/prompts` | hierarchy ≤ 3 |
| POST | `/api/final-consolidation-audit/audit` | hierarchy ≤ 2 |
| GET | `/api/final-consolidation-audit/audit/quick` | hierarchy ≤ 3 |
| GET | `/api/final-consolidation-audit/snapshots` | hierarchy ≤ 2 |

## Frontend

- `/app/admin/final-consolidation` — `FinalConsolidationHub.jsx` (StrictAdmin)
- Rollout Center: capacidade `final_consolidation_audit` (P32)

## Serviços afectados

- `finalConsolidationAudit/` (novo, read-only)
- Integração read-only: `certificationReadiness`, `rolloutCenter`, runtime health facades
- **Não altera:** Motor A, Engine V2, chat hot path, flags em runtime

## Validação PROMPT 1–32

Catálogo SSOT: `promptSequenceCatalog.js` — 32 entradas com validadores por flag / evidência técnica.

Critério **production ON:** modo `on` \| `enforce` (não `shadow` eterno).

## Classificações

| ID | Label | Score mín. |
|----|-------|------------|
| `experimental` | Experimental | 0 |
| `pilot` | Pilot | 45 |
| `enterprise_ready` | Enterprise-ready | 65 |
| `industrial_ready` | Industrial-ready | 75 |
| `international_ready` | International-ready | 85 |

## Migração

- `final_consolidation_snapshots`
- `final_consolidation_audit`

## Testes

```bash
cd backend && node src/tests/waveFinalConsolidationAuditScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Score optimista | Evidência parcial ≠ production_on |
| Falsa classificação industrial | Blocker se telemetria < 60 |
| Mutação acidental | API read-only; sem alteração de `.env` |

## Dependências

- Docs mestres (6 relatórios de auditoria)
- PROMPT 23–31 modules
- PM2 + dotenv efectivo

## Rollback

`IMPETUS_FINAL_CONSOLIDATION_AUDIT_MODE=off`; snapshots históricos preservados.
