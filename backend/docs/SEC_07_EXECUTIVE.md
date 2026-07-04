# SEC-07 — Executive Dashboard

## KPIs

- Overall Security Score (0–1)
- Threat Level (NONE → CRITICAL)
- Integrity Score
- Baseline Compliance %
- Incident Load / Notification Load
- Response Readiness

## Executive Summary

Texto determinístico gerado por regras — exemplos:

- "Nenhum incidente activo."
- "Integridade preservada."
- "Baseline íntegra."
- "Nenhuma acção crítica pendente."

## Tendência

`stable` | `elevating` — baseado em incidentes abertos/critical.

## Endpoint

`GET /api/audit/security-soc/executive`
