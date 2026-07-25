# FIN-EVOLVE-001 — Integration

**Fase:** A — Integration First  
**Layer:** `financeIntegrationLayer.js`

---

## Integrações (composição apenas)

| Módulo | API Contract | Serviço existente | UI reutilizada |
|--------|--------------|-------------------|----------------|
| costs | dashboard.costs | industrialCostService | CentroCustosExecutivo |
| leakage | dashboard.financialLeakage | financialLeakageDetectorService | MapaVazamentoFinanceiro |
| billing | nexusWallet.admin | nexusBillingEngine + wallet | NexusIACustos |
| command_center | finance_management | dashboardProfiles | CentroComando (link externo) |

---

## Proibido

- Recriar Nexus billing engine
- Recriar industrial cost service
- Recriar leakage detector
- Novos endpoints backend nesta fase

---

## REG-002 dependências

Financial leakage e industrial map remontados em REG-002 — workspace Finance consome contratos já activos.
