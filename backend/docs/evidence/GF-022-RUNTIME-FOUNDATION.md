# GF-022 — Supply Runtime Foundation

**Identificador:** `GF-022`  
**Domínio:** Supply · `supply_native`  
**Norma:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](../architecture/ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Pré-requisitos:** DEC-001 ✅ · GF-021 ✅ · EV-001 ✅  
**Data:** 2026-07-17

---

## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| **Categoria** | Greenfield (GF) — Runtime Foundation |
| **Objetivo** | Infraestrutura inicial `supply_native` sem regras de negócio |
| **Critérios de entrada** | DEC-001 SUPPLY · GF-021 · ARC-001/002 · BASELINE v1.4 |
| **Critérios de saída** | Estrutura · registry · contratos · eventos · testes |
| **Impacto arquitetural** | Aditivo — domains/supply + registries foundation |
| **Baselines afectadas** | Nenhuma LOCKED alterada |
| **Justificativa** | GF-022 padrão PPAP/MSA adaptado ARC-002; WMS paralelo isolado |

---

## Gate de validação

| Flag | Valor |
|------|-------|
| SUPPLY_RUNTIME_CREATED | **YES** |
| RUNTIME_REGISTERED | **YES** |
| FOUNDATION_STRUCTURE_CREATED | **YES** |
| EVENT_NAMESPACE_DEFINED | **YES** |
| CANONICAL_CONTRACTS_DEFINED | **YES** |
| INTEGRATIONS_DECLARED | **YES** |
| OBSERVABILITY_ENABLED | **YES** |
| TEST_SUITE_CREATED | **YES** |
| BUSINESS_RULES_IMPLEMENTED | **NO** |
| SIGNAL_LOADER_IMPLEMENTED | **NO** |
| PROMOTION_IMPLEMENTED | **NO** |
| CONSOLIDATION_IMPLEMENTED | **NO** |
| COMMAND_CENTER_IMPLEMENTED | **NO** |
| WMS_DIRECT_INTEGRATION | **NO** |
| BASELINE_SYSTEM_v1.4 | **PRESERVED** |

---

## Runtime Identity

```
runtime_id     = supply_native
version        = 0.1.0
status         = FOUNDATION
domain         = Supply
event_prefix   = supply.
baseline_target = BASELINE-SUPPLY-v2.0
foundation_inc = GF-022
cockpit_mode   = off
```

---

## Estrutura criada

```
backend/src/domains/supply/
├── core/           supplyRuntimeIdentity · supplyEntityRegistry
├── runtime/        supplyFoundationRuntime (startup · health)
├── registry/       supplyRuntimeRegistry
├── contracts/      interfaces (6 tipos canónicos)
├── events/         supplyEventCatalog · supplyEventNamespace
├── services/       foundationContractService
├── shared/         flags · integrationContracts · observability
├── config/         supplyFoundationConfig
└── README.md
```

---

## Registries

| Registry | Entrada |
|----------|---------|
| `domainRegistry` | `supply` · status `foundation` · `supply_native` |
| `cognitiveDomainRegistry` | `supply` · maturity `foundation` · GF-022 |
| `FOUNDATION_RUNTIMES` (ARC-001 manifest) | `supply_native` |

**Nota:** `cognitiveRuntimeFacade` **não** anexa payload Supply em `/dashboard/me` — reservado GF-024+.

---

## Contratos canónicos (interfaces only)

Supplier · PurchaseRequest · PurchaseOrder · Contract · Quotation · Approval

---

## Eventos reservados (sem processamento)

- `supply.request.created`
- `supply.order.approved`
- `supply.vendor.selected`
- `supply.contract.updated`

---

## Integrações declarativas

| Sistema | Modo | Active GF-022 |
|---------|------|:-------------:|
| Executive | read | NO |
| Logistics/WMS (OCL) | read | NO (declarative) |
| PPAP · MSA · Ishikawa | read | NO |
| ERP | read | NO |

---

## Testes

```bash
npm run test:supply-foundation
```

Cobertura: identity · registries · contracts · events · startup · flags · WMS isolation · facade unchanged.

---

## Próximo passo

**GF-023 — Supply Core Domain**

Paralelo: **WMS-003** Operational APIs.

---

*Referências:* [DEC-001](../evidence/DEC-001-DOMAIN-SELECTION.md) · [SUPPLY-RUNTIME-INVENTORY.md](./SUPPLY-RUNTIME-INVENTORY.md)
