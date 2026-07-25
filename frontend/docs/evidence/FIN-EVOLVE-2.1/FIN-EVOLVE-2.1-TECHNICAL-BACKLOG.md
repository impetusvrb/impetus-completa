# FIN-EVOLVE-2.1 — Technical Backlog (HIGH residual)

Itens **não bloqueantes** do FIN-DATA-001, tornados backlog explícito e slots de extensão do motor.

| ID | Título | Extension slot | Como incorporar depois |
|----|--------|----------------|------------------------|
| GAP-FD-001 | Impact API certification | `impactApiProvider` | Passar provider em `runEconomicIntelligence({ extensions })` sem mudar consumidores Hub |
| GAP-FD-002 | KPI field aliases | `kpiAliasNormalizer` | Default já no motor; override por planta |
| GAP-FD-005 | Energy rates per plant | `plantRateProvider` | Preencher rates sem alterar `finance.driver_rate.v1` |

**Regra:** extensões não podem quebrar contratos públicos nem alterar a assinatura de `runEconomicIntelligence` / `applyEconomicIntelligenceToView`.
