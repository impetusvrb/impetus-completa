# FIN-EVOLVE-001 — Capability Map

| capabilityId | Origem | Provider | Contrato | Estratégia |
|--------------|--------|----------|----------|------------|
| industrial_costs | platform_dashboard | industrialCostService | dashboard.costs | reuse_route |
| financial_leakage | platform_dashboard | financialLeakageDetectorService | dashboard.financialLeakage | reuse_api |
| nexus_billing | nexus_ia | nexusBillingEngine | nexusWallet.admin | reuse_route |
| nexus_wallet | nexus_ia | nexusWalletService | nexusWallet.admin | compose |
| nexus_ledger | nexus_ia | nexusBillingEngine ledger | nexusWallet.admin | compose |
| view_financial | platform_governance | authorize.js | VIEW_FINANCIAL | compose |
| contextual_finance_modules | contextual_modules | moduleRegistry | contextual unlock | compose |
| centro_comando_finance_widgets | command_center | dashboardProfiles | finance_management | reuse_route |

Fonte canónica: `frontend/src/domains/finance/registry/financeCapabilityRegistry.js`
