# OPM-000 — Supply Coverage Audit

**Modo:** READ ONLY · **Data:** 2026-07-19

---

## Metodologia

Referência funcional: **GF-021 Discovery** (7 Cognitive Centers, procure-to-pay, 8 entidades REST GF-027, integração WMS read-only via OCL/Pilot).

---

## Matriz por capacidade Supply

| Capacidade | Previsto | Implementado | Parcial | Faltando | Maturidade Produto |
|------------|:--------:|:------------:|:-------:|:--------:|:------------------:|
| **Suppliers** | 55 | 18 | 12 | 25 | **38%** |
| **Categories / Spend Centers** | 40 | 16 | 10 | 14 | **40%** |
| **Purchase Requests** | 60 | 20 | 15 | 25 | **42%** |
| **Purchase Orders** | 58 | 19 | 14 | 25 | **41%** |
| **Quotations** | 50 | 15 | 12 | 23 | **38%** |
| **Contracts** | 52 | 16 | 11 | 25 | **37%** |
| **Approvals workflow** | 48 | 17 | 13 | 18 | **44%** |
| **Pilot Integration (WMS)** | 45 | 30 | 10 | 5 | **67%** |
| **Cognitive / Promotion / CC** | 85 | 42 | 28 | 15 | **49%** |
| **Workspace FE (produto)** | 70 | 8 | 22 | 40 | **18%** |

---

## Detalhe arquitectural vs produto

### Camada certificada (GF-022→027 + REV-002)

| Componente | Estado | Localização |
|------------|:------:|-------------|
| Core Domain | ✅ | `backend/src/domains/supply/core/` |
| Signal Loader | ✅ | `supplyTenantSignalLoader.js` |
| Promotion Runtime | ✅ | `supplyPromotionRuntime.js` |
| Semantic Signals | ✅ | `supplySemanticSignalNormalizer.js` |
| REST APIs v1 (8 entidades) | ✅ | `supplyV1Routes.js` |
| RBAC (8 permissões, 3 perfis) | ✅ | `supplyRbacDefinitions.js` |
| Pilot Integration Layer | ✅ | `supplyPilotIntegrationLayer.js` |
| INC-048 bridge | ✅ | `integration/inc048/` |
| CC supply_native | ✅ | `SupplyNativeCockpitPromotion.jsx` |

### Camada produto (gap principal)

| Expectativa GF-021 | Estado actual |
|--------------------|---------------|
| 7 Cognitive Centers operacionais | ✅ CC widgets; ⚠️ dados tenant-dependent |
| UI workspace por entidade (fornecedores, PR, PO…) | ❌ `SupplyWorkspacePage` = shell + lista textual |
| Fluxos approve/submit/quote na UI | ❌ API only (`submit`, `approve`, `execute`) |
| OTIF / spend analytics dashboards | ⚠️ CC/cognitive; sem ecrãs dedicados FE |
| Integração ERP master data | ⚠️ Pilot/contracts; não produto FE |

---

## Classificação dimensional Supply

| Dimensão | % | Justificação |
|----------|:-:|--------------|
| **Arquitectura** | 98% | GF-027 homologado; GAP-SUP-001…006 CLOSED |
| **Navegação** | 75% | Menu presentation + workspace path; UI shell |
| **Segurança** | 100% | RBAC + flags certificados |
| **Runtime / APIs** | 90% | REST v1; store in-memory (pilot) |
| **Produto Operacional (UI)** | **22%** | Workspace não operacional |
| **UX Industrial** | 40% | DS mínimo no shell |
| **Industry 4.0** | 49% | Promotion + CC; falta densidade decisória UI |

---

## Go Live Readiness — Supply

## **PILOTO (ARQUITECTURA COMPLETA · PRODUTO INCOMPLETO)**

**Justificação:** Domínio **arquitecturalmente completo** e certificado em BASELINE-SUPPLY-v2.0. Como **produto** de suprimentos (procure-to-pay na mão do utilizador), permanece **incompleto** — operador não dispõe de ecrãs transaccionais por entidade.

**Pode entrar em produção limitada:** integrações API-to-API, CC executivo, pilot tenant com flags ON.

**Não considerar funcionalmente completo** para Go Live operacional pleno.
