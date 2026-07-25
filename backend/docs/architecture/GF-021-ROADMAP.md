# GF-021 — Supply Greenfield Roadmap

**Identificador:** `GF-021-ROADMAP`  
**Domínio:** **Supply** · `supply_native`  
**Decisão:** [DEC-001-DOMAIN-SELECTION.md](../evidence/DEC-001-DOMAIN-SELECTION.md)  
**Norma:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data:** 2026-07-17

---

## Sequência oficial Supply

```
GF-021  Supply Discovery              ✅ (+ DEC-001)
   ↓
GF-022  Supply Runtime Foundation        ✅ FOUNDATION
   ↓
GF-023  Supply Core Domain                  ✅
   ↓
GF-024  Supply Semantic Signal Loader       ✅
   ↓
GF-025  Supply Promotion + CC Foundation   ✅
   ↓
GF-026  Pilot Enablement + Integration     ✅
   ↓
GF-027  Operational Readiness & Homologation ✅
   ↓
INC-048 → BASELINE-SUPPLY-v2.0 → BASELINE-SYSTEM v1.5
   ↓
REV-002
```

---

## GF-022 — Supply Runtime Foundation ✅

| Entrega | Estado |
|---------|:------:|
| Runtime ID | `supply_native` v0.1.0 FOUNDATION |
| Domínio | `backend/src/domains/supply/` |
| Registries | domainRegistry + cognitiveDomainRegistry |
| Testes | `npm run test:supply-foundation` |
| Facade CC | **Não anexado** (GF-024+) |

**Evidência:** [GF-022-RUNTIME-FOUNDATION.md](../evidence/GF-022-RUNTIME-FOUNDATION.md)

---

## GF-023 — Supply Core Domain ✅

| Entrega | Estado |
|---------|:------:|
| Semantics SSOT | `supplyCoreSemantics.js` |
| Aggregates | PurchaseRequest |
| Domain Services | 7 serviços in-memory |
| Policies | 5 determinísticas |
| Events GF-023 | 7 mínimos |
| WMS | Declarativo only |

**Evidência:** [GF-023-CORE-DOMAIN.md](../evidence/GF-023-CORE-DOMAIN.md)

---

## GF-024 — Supply Semantic Signal Loader ✅

| Entrega | Estado |
|---------|:------:|
| Semantic Loader | `supplyTenantSignalLoader.js` |
| Normalizer SSOT | `supplySemanticSignalNormalizer.js` → `supplyCoreSemantics.js` |
| Binding | `supplySignalBindingRuntime.js` (7 entidades) |
| Block Bridge | `supplyBlockBridge.js` |
| Logger | `supplySignalLoaderLogger.js` |
| Read-Only | Sem BD · HTTP · WMS · OCL |
| Testes | `npm run test:supply-signal-loader` |
| Facade CC | **Não anexado** (GF-026) |

**Evidência:** [GF-024-SIGNAL-LOADER.md](../evidence/GF-024-SIGNAL-LOADER.md)

---

## GF-025 — Supply Promotion + CC Foundation ✅

| Entrega | Estado |
|---------|:------:|
| Promotion Runtime | `supplyPromotionRuntime.js` |
| Promotion Policy | `supplyPromotionPolicy.js` |
| Block Resolver | `supplyCognitiveBlockResolver.js` |
| CC Foundation | `cognitive/supplyCommandCenter*.js` (7 centros) |
| REV-001 conformant | YES — sem facade/dashboard |
| Testes | `npm run test:supply-promotion` |

**Evidência:** [GF-025-PROMOTION.md](../evidence/GF-025-PROMOTION.md)

---

## GF-026 — Supply Pilot Enablement & Integration Layer ✅

**Normas:** REV-001 · WMS-003 · GF-025  
**Evidência:** [GF-026-PILOT-ENABLEMENT.md](../evidence/GF-026-PILOT-ENABLEMENT.md)

| Entrega | Detalhe |
|---------|---------|
| Pilot Integration Layer | `domains/supply/pilot/` — contratos v0.3.0 → APIs WMS v1 |
| Facade attachment | `supply_signal_loader` + `supply_cognitive_runtime` + CC Z.23 |
| Canonical Bridge | HTTP público — **zero imports** logistics-operational |
| Feature flags | `IMPETUS_SUPPLY_PILOT_*` — default **false** |
| Perfil piloto | `manager_supply` / `manager_procurement` |

**GAPs fechados:** GAP-SUP-002 · GAP-WMS-001 (WMS-003)

**Transferidos GF-027:** GAP-SUP-003 (REST APIs) · GAP-SUP-004 (RBAC formal) · GAP-SUP-005 (UI/menu)

**Parecer:** [READY FOR GF-027 WITH CONDITIONS](../evidence/GF-026-ARCHITECTURE-CONFORMANCE.md)

---

## GF-027 — Supply Operational Readiness & Homologation ✅

**Evidência:** [GF-027-HOMOLOGATION.md](../evidence/GF-027-HOMOLOGATION.md)

| Entrega | Detalhe |
|---------|---------|
| REST APIs v1 | `/api/supply` — 8 entidades |
| RBAC | 8 permissões · 3 perfis |
| Workspace | `/app/supply/workspace` (flags OFF) |
| CC | supply_native · 7 hubs |
| Homologation | `test:supply-runtime-homologation` |

**GAPs fechados:** GAP-SUP-003/004/005/006

**Parecer:** [READY FOR INC-048](../evidence/GF-027-ARCHITECTURE-CONFORMANCE.md)

---

## Próximo marco — INC-048

Integração Supply + WMS · BASELINE-SUPPLY-v2.0 · registo SYSTEM v1.5.

**Não abrir novas Greenfields Supply** — foco em consolidação (WMS-004/005/006, REV-002).

---

## Paralelismo WMS

```
GF-022…027 Supply              WMS-003…006
     │                              │
     supply_native                  logistics-operational
     (cognitive)                    (OCL — read by Supply loader)
```

Supply loader **consome** WMS via OCL read-only — **não altera** WMS.

---

## Finance (adiado)

Runtime `finance_native` reservado para Greenfield futura — não interfere sequência Supply.

---

*Referência:* [GF-021-DISCOVERY.md](GF-021-DISCOVERY.md) · [DEC-001](../evidence/DEC-001-DOMAIN-SELECTION.md)
