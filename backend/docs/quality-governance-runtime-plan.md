# Quality — Governance & Intelligence Runtime (Etapa 3)

## Visão

Camada **tática / executiva / analítica** do domínio Quality, **separada** do runtime operacional (Etapa 2). Não substitui workflows, authority nem bounded contexts.

## Componentes principais (backend)

| Área | Caminho |
|------|---------|
| Flags | `governance/qualityGovernanceRuntimeFlags.js` |
| Orquestração SPC/drift | `governance/qualityGovernanceOrchestrator.js` |
| SPC / CEP | `governance/spc/*` |
| CAPA assistivo | `governance/capa/*` |
| Fornecedor | `governance/supplier/*` |
| Risco / FMEA | `governance/risk/*` |
| Executivo / narrativa | `governance/executive/*` |
| Analytics | `governance/analytics/*` |
| Auditoria / compliance | `governance/audit/*` |
| IA assistiva | `governance/ai/*` |

## API

Prefixo: `/api/quality-governance` (auth + `requireCompanyActive` + limiter).

- `GET /health` — snapshot de flags (mesmo com runtime OFF).
- `POST /intelligence/spc/screen` — avalia subgrupos; pode emitir `quality.spc.violation_detected`.
- `POST /intelligence/drift/screen` — tendência linear; pode emitir `quality.process.drift_detected`.
- `POST /intelligence/fmea/rank` — RPN (flag risco).
- `POST /intelligence/analytics-pack` — pacote analítico combinado.
- `POST /intelligence/narrative` — narrativa determinística (flag explainability).
- `POST /intelligence/insight-pack` — insights + sugestão assistiva (sem aprovação).
- `POST /intelligence/supplier/scorecard` — scorecard (flag fornecedor).
- `GET /audit/explore` — leitura da cadeia imutável existente.

## Eventos industriais (catálogo)

Novos tipos: `quality.spc.violation_detected`, `quality.capa.risk_escalated`, `quality.supplier.score_changed`, `quality.audit.reconstructed`, `quality.executive.insight_generated`, `quality.risk.threshold_exceeded`, `quality.analytics.pattern_detected`.

Publicação via `publishQualityIndustrialEvent` com `origin_layer: 'governance'` quando aplicável.

## Frontend (sem App.jsx)

Integração por **`?view=governance`** em `/app/quality/operational`, com lazy `QualityGovernanceHub.jsx` e flags `VITE_IMPETUS_QUALITY_*`.

## Observabilidade (WAVE 2)

Métricas aditivas via `enterpriseObservabilityRuntime.recordMetric` (`quality_governance_spc_eval_ms`, `quality_governance_analytics_pack_ms`, `quality_governance_narrative_ms`).

## Rollback

1. `IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED=false` (backend).
2. `VITE_IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED=false` (frontend build).
3. Contrato qualidade: `CONTRACT_VERSION` 4 — revert só se remover eventos do catálogo (evitar em produção).

## Testes

```bash
cd backend && npm run test:quality-governance-runtime
cd frontend && npm run test:quality-governance-runtime
```

Ver também: `quality-spc-runtime.md`, `quality-capa-intelligence.md`, `quality-executive-runtime.md`.
