# WMS Implementation Roadmap

**Programa:** Operational Completion — Logistics (WMS)  
**Início:** WMS-001 (2026-07-17)  
**Norma de execução:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Baseline preservado:** BASELINE-SYSTEM v1.4 · logistics_native LOCKED

---

## Visão

Completar o domínio operacional WMS preservando integralmente o runtime cognitivo homologado. **Não é Greenfield** — é programa de implementação funcional pós-AUD-001.

**Princípio WMS-002+:** uma única fronteira operacional via **Operational Compatibility Layer** — sem dual stack concorrente.

---

## Sequência estratégica (duas frentes paralelas)

```
BASELINE-SYSTEM v1.4
        │
        ├─────────────────┐
        │                 │
        ▼                 ▼
    ARC-002           WMS-002
  Governança doc    OCL + Core Services
        │                 │
        └────────┬────────┘
                 ▼
    Platform Stabilization Review
                 ▼
             WMS-003
      Operational APIs
                 ▼
         WMS-004 … WMS-006
                 ▼
         BASELINE-WMS-v1.0
```

| Frente | Tipo | Conflito |
|--------|------|----------|
| ARC-002 | Governança documental (delivery standard) | Nenhum com WMS |
| WMS-002+ | Completude funcional Logística | Isolado em `logistics-operational/` |

---

## Roadmap oficial

```
WMS-001  Foundation                         ✅
    ↓
WMS-002  Core Operational Services          ✅ OCL + Legacy Adapter + Core Services
    ↓
WMS-003  Operational APIs                   ✅ REV-001 · GAP-WMS-001 CLOSED
    ↓
WMS-004  Frontend Workspace                   ✅
    ↓
INC-048  Supply + WMS Convergence             ✅
    ↓
WMS-005  Integrated Operational Validation      ✅
    ↓
WMS-006  Frozen Homologation                     ✅
    ↓
REV-002  Final Conformance Review                 ← PRÓXIMO
    ↓
BASELINE-SUPPLY-v2.0 / BASELINE-WMS-v1.0
```

---

## WMS-001 — Foundation ✅

| Item | Entrega |
|------|---------|
| SSOT 12 entidades | `wms_*` migration |
| Domínio | `logistics-operational` |
| APIs stub | `/api/logistics-operational/*` |
| FE workspace | `/app/logistics-operational/workspace` |
| Flags | 6 flags default OFF |
| Legado | Estratégia adapter documentada |

**Evidência:** [WMS-001-FOUNDATION.md](../evidence/WMS-001-FOUNDATION.md)

---

## WMS-002 — Core Operational Services + OCL ✅

**Arquitectura:** [WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md](../evidence/WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md) · [WMS-002-CORE-SERVICES.md](../evidence/WMS-002-CORE-SERVICES.md)

**Encerrado:** 2026-07-17 · Norma ARC-002 aplicada (secção Conformidade ARC-002)

```
warehouse_* → Legacy Adapter → OCL → WMS Core Services → (APIs WMS-003)
```

| Entrega | Detalhe |
|---------|---------|
| Legacy Adapter | Normalização `warehouse_*` → DTO canónico |
| Operational Compatibility Layer | Interface única; routing legacy/wms/hybrid |
| Inventário legado | [WMS-LEGACY-WAREHOUSE-INVENTORY.md](../evidence/WMS-LEGACY-WAREHOUSE-INVENTORY.md) |
| Classificação | Migrar · Reaproveitar · Descontinuar · Substituir |
| Proibição | Core Services **não** acedem legado directamente |
| Serviços | Inventory, Movement, Receiving, Picking, Shipping, Transfer (regras base) |
| Eventos | `wms.*` via event backbone |
| Testes | `npm run test:wms-core-services` |

**Gate:** EV-001 Platform Stabilization Review ✅ — GF-021 autorizada (READY WITH CONDITIONS)

---

## WMS-003 — Operational APIs ✅

- Substituídos stubs por `/api/logistics-operational/v1/*`
- Controllers OCL-only · RBAC · flags fail-closed
- **GAP-WMS-001 CLOSED**
- Evidência: [WMS-003-OPERATIONAL-APIS.md](../evidence/WMS-003-OPERATIONAL-APIS.md)
- **GF-026 Readiness:** READY WITH CONDITIONS

---

## WMS-004 — Frontend Workspace ✅

- Workspace operacional v1-only (sem mocks)
- **GAP-WMS-002 CLOSED**
- Evidência: [WMS-004-WORKSPACE.md](../evidence/WMS-004-WORKSPACE.md)
- **INC-048 Readiness:** READY FOR INC-048

---

## INC-048 — Supply + WMS Convergence ✅

- Operational Convergence Layer (`integration/inc048/`)
- Matriz compatibilidade automática
- **Nenhum runtime homologado alterado**
- Evidência: [INC-048-CONVERGENCE.md](../evidence/INC-048-CONVERGENCE.md)
- **WMS-005 Readiness:** READY FOR WMS-005

---

## WMS-005 — Integrated Operational Validation ✅

**Modo:** validação only — sem novas capacidades arquiteturais (INC-048 conformant)

| Item | Entrega |
|------|---------|
| Runtime validação | `backend/src/validation/wms005/` |
| Cenários E2E | Procurement→Receiving, Picking, Shipping, Transfer, Cognitive |
| Pilot Matrix | componentes, contratos, APIs, flags, RBAC por cenário |
| RBAC validation | operador, supervisor, gestor, procurement, admin |
| Feature flags | all off, pilot, isolated, integrated |
| Workspace + CC | validação estática (sem novos componentes visuais) |
| Testes | `test:wms-pilot`, `test:end-to-end`, `test:wms005-static` |
| **GAP-WMS-003** | **VALIDATED** (activation prod → WMS-006) |

**Evidência:** [WMS-005-EXECUTIVE-SUMMARY.md](../evidence/WMS-005-EXECUTIVE-SUMMARY.md)  
**Parecer:** **READY FOR WMS-006**

---

## WMS-006 — Frozen Homologation ✅

**Modo:** homologação congelada — zero evolução arquitectural

| Item | Entrega |
|------|---------|
| Runtime homologação | `backend/src/validation/wms006/` |
| Re-certificação E2E | vs baseline WMS-005 (sem regressão) |
| Production Readiness Checklist | contratos, APIs, RBAC, rollback, monitorização |
| Baseline Candidate Manifest | `BASELINE-CANDIDATE-SUPPLY-WMS-v2.0` |
| Ativação controlada | piloto tenant only; produção global bloqueada |
| Testes | `test:production-readiness` |
| **GAP-WMS-004** | **CERTIFIED** |

**Evidência:** [WMS-006-EXECUTIVE-SUMMARY.md](../evidence/WMS-006-EXECUTIVE-SUMMARY.md)  
**Parecer:** **READY FOR REV-002**

---

## REV-002 — Final Conformance Review ← PRÓXIMO

- Verificar integridade do Baseline Candidate Manifest
- Gate obrigatório antes de BASELINE-SUPPLY-v2.0

---

## BASELINE-WMS-v1.0 / BASELINE-SUPPLY-v2.0

- Homologação operacional
- INC + registo BASELINE-SYSTEM v1.5+

---

## Migração legado — princípio único

> `warehouse_*` → **Legacy Adapter** → **OCL** → `wms_*`  
> Evita dois domínios operacionais concorrentes.

---

## Rastreabilidade

| ID | Documento |
|----|-----------|
| AUD-001 | Auditoria operacional |
| WMS-001 | Foundation |
| WMS-002 | OCL + Core Services ✅ |
| WMS-LEGACY | Inventário warehouse_* |
| ARC-002 | Greenfield Delivery Standard (paralelo) |
