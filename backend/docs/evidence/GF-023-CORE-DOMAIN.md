# GF-023 — Supply Core Domain

**Identificador:** `GF-023`  
**Domínio:** Supply · `supply_native`  
**Norma:** ARC-002  
**Data:** 2026-07-17  
**Pré-requisito:** GF-022 ✅ · DEC-001 ✅

---

## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| **Categoria** | Greenfield — Core Domain |
| **Objetivo** | Núcleo semântico procure-to-pay desacoplado do WMS |
| **Critérios de saída** | UL · agregados · serviços · políticas · eventos · testes |
| **Impacto** | `domains/supply/` — sem BD/API/cognitive |

---

## Gate

| Flag | Valor |
|------|-------|
| UBIQUITOUS_LANGUAGE_FINALIZED | YES |
| DOMAIN_MODEL_IMPLEMENTED | YES |
| DOMAIN_SERVICES_CREATED | YES |
| DOMAIN_POLICIES_DEFINED | YES |
| DATABASE_ACCESS | NO |
| OCL/WMS IMPORTS | NO |
| SIGNAL_LOADER/PROMOTION/CC | NO |

---

## Estrutura GF-023

```
domains/supply/
├── semantics/supplyCoreSemantics.js
├── model/valueObjects.js
├── model/aggregates/purchaseRequestAggregate.js
├── policies/supplyDomainPolicies.js
├── services/*DomainService.js (6 + PO)
└── events/supplyDomainEvents.js
```

---

## Serviços de domínio

SupplierQualification · PurchaseRequest · QuotationEvaluation · ContractLifecycle · ApprovalPolicy · SpendAnalysis · PurchaseOrderDomain

---

## Testes

```bash
npm run test:supply-core-domain
npm run test:supply-foundation
```

---

## Próximo

**GF-024 — Supply Signal Loader**

---

*Ver também:* [SUPPLY-DOMAIN-MODEL.md](./SUPPLY-DOMAIN-MODEL.md) · [SUPPLY-POLICIES.md](./SUPPLY-POLICIES.md) · [SUPPLY-EVENTS.md](./SUPPLY-EVENTS.md)
