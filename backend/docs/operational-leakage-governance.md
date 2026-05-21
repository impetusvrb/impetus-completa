# Phase Z.13 — Operational Leakage Command Center

Monitorização em produção de leakage, underdelivery, blindness e governance drift.

## Módulos

`operationalLeakageAnalyzer`, `hierarchyLeakageDetection`, `domainLeakageDetection`, `operationalBlindnessAnalyzer`, `governanceLeakageTimeline`, `operationalLeakageFacade`

## API

`/api/internal/operational-leakage/*` — `status`, `readiness`, `leakage`, `blindness`, `governance`, `report`

## Princípios

- Observability-first
- Sem auto-remediação
- Timeline por tenant (memória processo)

## Testes

```bash
npm run test:operational-leakage
```
