# FIN-STAB-001 — Integration Certification

## Capacidades integradas (sem duplicação)

| Capacidade | Componente reutilizado | Rota Finance |
|------------|------------------------|--------------|
| Industrial Costs | `CentroCustosExecutivo` | `/app/finance/costs` |
| Financial Leakage | `MapaVazamentoFinanceiro` | `/app/finance/leakage` |
| Nexus Billing / Wallet / Ledger | `NexusIACustos` | `/app/finance/billing` |
| Contextual Modules | `financial_intelligence`, `cost_center`, `losses_map` | hub / deep-links |
| Recommendation / CC | widgets + deep-links oficiais | Centro Comando |

## Garantias

- Nenhum engine novo criado nesta fase
- REG-002 leakage APIs preservadas
- Integration layer (`FINANCE_WORKSPACE_INTEGRATIONS`) intacto

## Observabilidade

Eventos `impetus:finance` — `FINANCE_WORKSPACE_VIEW`, `FINANCE_CAPABILITY_NAVIGATE`, compose.
