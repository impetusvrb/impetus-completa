# PROMPT 31 — Certification Readiness

**Data:** 2026-05-28  
**Fase:** T3.9–T3.11 — Readiness ISO 27001, ISO 42001, SOC 2, IEC 62443  
**Estado:** `on` — avaliação técnica automatizada + snapshots

## Objetivo

Auditoria completa de **readiness** para certificações enterprise, gerando:

- **Gap analysis** por controlo
- **Remediation matrix** priorizada
- **Certification roadmap** (Q1–Q4)
- **Evidence inventory** técnico

> **Não substitui** auditoria formal externa nem emite certificado.

## Frameworks

| ID | Norma | Âmbito |
|----|-------|--------|
| `ISO_27001` | ISO/IEC 27001 | ISMS |
| `ISO_42001` | ISO/IEC 42001 | AI Management |
| `SOC2` | SOC 2 Type II | Trust Services |
| `IEC_62443` | IEC 62443 | Industrial cybersecurity |

## Flags

| Variável | Default | Função |
|----------|---------|--------|
| `IMPETUS_CERTIFICATION_READINESS_MODE` | `on` | `off` \| `shadow` \| `audit` \| `on` |
| `IMPETUS_CERTIFICATION_READINESS_ENABLED` | `true` | Activa motor |

**Rollback:** `MODE=off` + `pm2 reload --update-env`.

## Rotas API

| Método | Rota | RBAC |
|--------|------|------|
| GET | `/api/certification-readiness/health` | auth |
| GET | `/api/certification-readiness/frameworks` | hierarchy ≤ 3 |
| POST | `/api/certification-readiness/assess` | hierarchy ≤ 2 |
| GET | `/api/certification-readiness/assess/quick` | hierarchy ≤ 3 |
| GET | `/api/certification-readiness/snapshots` | hierarchy ≤ 2 |

## Frontend

- `/app/admin/certification-readiness` — `CertificationReadinessHub.jsx` (StrictAdmin, hierarchy ≤ 2 para POST assess)
- Menu admin: **Certification Readiness**
- API client: `certificationReadinessApi` em `frontend/src/services/api.js`
- Rollout Center: capacidade `certification_readiness` (P31)

## Evidências colectadas

- Flags `IMPETUS_*` efectivas
- Contagens BD (audit_logs, lineage, traces)
- Flag reconciler diagnostics
- Relatórios `backend/docs/*`
- `getIso42001ReadinessReport()` existente

## Migração

- `certification_readiness_snapshots`
- `certification_readiness_audit`

## Testes

```bash
cd backend && node src/tests/waveCertificationReadinessScenarios.js
```

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Falsa sensação de certificado | `not_formal_certification` em explainability |
| Score optimista | Evidência parcial = status partial, não met |
| Gaps OT | IEC 62443 depende de lab industrial real |

## Dependências

- Governance modules (KMS, DSR, RLS, MFA, APM)
- PROMPT 23–30 waves
- `aiGovernancePersistenceService`

## Rollback

Desactivar flags; snapshots históricos permanecem para auditoria.
