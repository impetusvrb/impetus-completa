# Phase Z.9 — Summary Underdelivery Protection

## Objectivo

Garantir guidance mínimo por perfil **sem** fabricar narrativas.

## Camadas

- `executiveNarrativeBlindnessProtection` — guidance estratégico (board, margem, trimestre).
- `operationalNarrativeBlindnessProtection` — guidance operacional (linha, turno, checklist).
- `narrativeCoverageValidator` — palavras mínimas por `hierarchy_tier`.
- `contextualNarrativeMinimums` — limiares por tier.

## Comportamento

- `recommendation_only: true` por defeito.
- `critical_underdelivery` dispara **apenas** restauro de snapshot existente na activação supervisionada.
- `narrative_fabricated: false` em todos os caminhos.

## API

`GET /api/internal/summary-runtime-activation/underdelivery`

## Testes

```bash
npm run test:summary-underdelivery
```
