# Maintenance Native Cognitive Cockpit — Feasibility Study (P1.1 Etapa 14)

**Data:** 2026-05-23 · **Âmbito:** auditoria apenas — **sem implementação**

## 1. Manutenção merece cockpit nativo?

**Sim, com prioridade P1 pós-Z.27 ou em paralelo controlado.** Manutenção é domínio operacional pesado com telemetria de ativos, OS, MTBF/MTTR e correlação com paradas de produção. Hoje vive como **foundation** (genericidade ~0,72) com widgets legados e correlação interna em `production.maintenance_correlation`, insuficiente para operadores PCM.

## 2. É domínio operacional pesado?

**Sim.** PCM consome backlog, criticidade de ativos, preventiva vs corretiva, heatmaps de falha e janelas de parada — densidade e alert fatigue comparáveis a produção, com foco em **asset-centric** (não turno/OEE).

## 3. Valor cognitivo

- Reduzir MTTR com narrativa de falha + parts risk
- Antecipar quebra (predictive) quando sensores existirem
- Isolar semanticamente de RH/ESG/executivo
- Correlacionar **internamente** com produção (downtime) sem leakage visual

## 4. Engines já existentes

| Fonte | Capacidade |
|-------|------------|
| `cognitiveBlockRegistry` | `maintenance.work_order_center` (1 bloco foundation) |
| `productionSignalLoader` | `maintenance_open`, `downtime_proxy` |
| `production.maintenance_correlation` | Correlação interna produção↔OS |
| `/api/manutencao-ia` | ManuIA (feature-flag); não é runtime cognitivo Z.24 |
| `dashboardKPIs` / `userContext` | MTBF, MTTR, backlog por perfil PCM |
| `cognitiveDomainRegistry` | Domínio `maintenance` maturity **foundation**, `cockpit_ready: false` |

**Não existem** ainda: `maintenanceCognitiveBlockPack` (16 blocos), signal loader dedicado, live validation, governance pack nativo.

## 5. Maturidade actual

- Registry Z.24: **foundation**, engines: **0** no gap report
- Widgets personalizados (`manutencao`) no dashboard legado
- Integração cognitiva: **derivada de produção** (~30% do valor operacional)

## 6. Telemetria suficiente?

**Parcial.** Dados de OS/backlog via KPIs e produção; sensores preditivos dependem de integração IIoT por tenant. Viável com **graceful empty** (mesmo padrão ambiental/produção) — nunca inventar MTBF.

## 7. Blocos necessários (proposta)

| Bloco | Função |
|-------|--------|
| `maintenance.predictive_failure` | Risco preditivo (quando telemetria) |
| `maintenance.mtbf_mttr` | Indicadores confiabilidade |
| `maintenance.asset_health` | Saúde por ativo crítico |
| `maintenance.preventive_schedule` | Preventiva vs vencida |
| `maintenance.breakdown_heatmap` | Heatmap falhas/linha |
| `maintenance.maintenance_narrative` | Narrativa PCM |
| `maintenance.parts_risk` | Risco de peças/backorder |
| `maintenance.downtime_correlation` | Correlação parada (interna) |
| `maintenance.machine_stability` | Estabilidade máquina |
| `maintenance.maintenance_ai` | IA contextual PCM |

## 8. Deve entrar antes do Z.27?

**Não como bloqueante.** Z.27 (Executive Boardroom) é **regulatory/strategic** e depende de isolamento dos domínios operativos já native. Manutenção pode permanecer derivada de produção **até** Z.27 estabilizar.

## 9. Deve entrar depois do Z.27?

**Recomendado como P1.2 / Z.M1** imediatamente após boardroom executivo, antes de logística/comercial. Valor operacional alto; não bloqueia boardroom.

## 10. Impacto arquitectural

- Aditivo: `domains/maintenance/` espelhando `production/` e `environmental/`
- Reutilizar Z.24 registry, density governor, live validation pattern
- **Sem** rewrite React/CSS; shadow-first
- PM2 reload only

## 11. Maturity delta esperado

| Estado | Score enterprise |
|--------|------------------|
| Actual (pós-P1.1) | ~86% |
| Com maintenance native | ~90% |
| Com executive Z.27 | ~93% |

## Conclusão obrigatória

**Manutenção deve evoluir para cockpit nativo (Z.M1), mas pode permanecer como domínio derivado de produção até Z.27 concluir.** Não implementar nesta fase — apenas priorizar arquitecturalmente **depois** do Executive Strategic Boardroom.
