# FIN-EVOLVE-2.3 — Hub integration

| Peça | Path |
|------|------|
| Hub card | `FinanceWhatIfHubCard` no `FinanceExecutiveDashboard` |
| View | `/app/finance/whatif` → `FinanceWhatIfView` |
| Twin entry | Link para `/app/finance/twin` (ponto de partida) |
| Módulo | `FINANCE_WORKSPACE_MODULES.whatif` (composeOnly) |
| Deep-link | `financial_whatif` |
| Integração | `FINANCE_WORKSPACE_INTEGRATIONS.whatif` |

Reutiliza o mesmo pipeline de dados do Twin (costs / leakage / twin state) só para compor o baseline — sem persistir cenários.
