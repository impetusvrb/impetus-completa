# Z.M1 — Predictive Maintenance Governance

**Data:** 2026-05-23

## Governança preditiva (futuro)

1. **Telemetria** — sensores IIoT com empty state honesto
2. **Usefulness** — binding ratio engine ≥0.75
3. **Fatigue** — heatmap + alertas OS ≤3 críticos
4. **Learning** — padrões de falha recorrente por ativo
5. **Orchestration** — correlação produção interna, sem leakage visual

## Proibido

- Auto-remediation de OS
- Auto-schedule preventiva sem aprovação
- ML opaco

## Orchestration maintenance

Bloco `maintenance.downtime_correlation` alimenta convergência learning sem expor linha-a-linha ao executivo.

Sem implementação nesta fase.
