# Z.M1 — Maintenance Domain Preparation

**Data:** 2026-05-23 · **Âmbito:** preparação arquitectural — sem runtime

## Objetivo

Preparar **Z.M1 Maintenance Native Cognitive Cockpit** após Z.27/Z.28, reutilizando padrões do boardroom executivo e domínios native.

## Blocos mapeados

| Bloco | Telemetria | Prioridade |
|-------|------------|------------|
| `maintenance.predictive_failure` | Sensores IIoT (graceful empty) | P0 |
| `maintenance.mtbf_mttr` | OS/histórico CMMS | P0 |
| `maintenance.asset_health` | Ativos críticos | P0 |
| `maintenance.preventive_schedule` | Calendário preventiva | P0 |
| `maintenance.breakdown_heatmap` | Falhas por linha/ativo | P1 |
| `maintenance.maintenance_narrative` | Narrativa PCM | P1 |
| `maintenance.parts_risk` | Backorder/peças | P1 |
| `maintenance.downtime_correlation` | Correlação produção (interna) | P0 |
| `maintenance.machine_stability` | Estabilidade máquina | P1 |
| `maintenance.maintenance_ai` | IA contextual PCM | P1 |

## Dependências

- `production.maintenance_correlation` (existente) → evoluir para domínio nativo
- `/api/manutencao-ia` → bridge, não runtime Z.24
- Signal loader dedicado com MTBF/MTTR/backlog

## Readiness Z.M1

**Medium** — engines parciais via produção; falta block pack (16 blocos) e live validation.

## Ordem recomendada

1. Z.28 Adaptive Orchestration
2. Z.M1 Maintenance Native Cockpit
3. Logistics / commercial (P3)
