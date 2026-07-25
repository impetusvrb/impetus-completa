# FIN-EVOLVE-001 — Architecture

**Programa:** FIN-EVOLVE-001 · Finance Domain Evolution (Phase A)  
**Estratégia:** integrate_then_develop (ARCH-PLAN-001 · PLATFORM-2026.1)  
**Princípio:** INTEGRATE BEFORE DEVELOP

---

## Governança

| Baseline | Referência |
|----------|------------|
| PLATFORM-2026.1 | Baseline congelada — programas horizontais proibidos |
| ARCH-PLAN-001 | Finance rank 1 · integrate_then_develop |
| FIN-AUD-001 | Capacidades reutilizáveis catalogadas |
| REG-002 | Cadeias leakage/industrial recuperadas |

---

## Estrutura do domínio

```
frontend/src/domains/finance/
├── registry/          # Capability registry (FIN-AUD reexport)
├── integration/       # Composition layer — orquestra existentes
├── contracts/         # Contratos públicos Finance
├── navigation/        # EOX + RBAC (financeAccess.js)
├── observability/     # Eventos EOX + impetus:finance
└── workspace/         # Layout EOX + hub + rotas composição
```

---

## Rotas

| Rota | Componente reutilizado | Provider |
|------|------------------------|----------|
| `/app/finance` | FinanceWorkspacePage (hub) | integration layer |
| `/app/finance/costs` | CentroCustosExecutivo | industrialCostService |
| `/app/finance/leakage` | MapaVazamentoFinanceiro | financialLeakageDetectorService |
| `/app/finance/billing` | NexusIACustos | nexusBillingEngine / wallet |

Rotas legacy preservadas: `/app/centro-custos-industriais`, `/app/mapa-vazamento-financeiro`, `/app/admin/nexusia-custos`

---

## Fora de escopo (Fase A)

ERP nativo · AP/AR · razão geral · tesouraria · fiscal · greenfield finance_native

---

## Sequência obrigatória

```
Discover Existing → Validate → Integrate → Expose Through Finance → Only Then Develop
```
