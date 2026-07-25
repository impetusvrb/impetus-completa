# DELIVERY-LIFECYCLE — Ciclos e Gates

**Identificador:** `DELIVERY-LIFECYCLE`  
**ARC:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data:** 2026-07-17

---

## 1. Template de gate (obrigatório por fase)

Cada fase de **qualquer** programa (GF · OCP · EV) deve documentar:

```markdown
## {FASE} — Gate

| Campo | Valor |
|-------|-------|
| Objetivo | … |
| Escopo | Inclusões / Exclusões |
| Critérios de entrada | … |
| Critérios de saída | FLAGS = YES/NO |
| Evidências | path/docs |
| Testes mínimos | npm run … |
| Aprovação | Homologation / Architecture |
```

---

## 2. Ciclo Greenfield — fases e gates

### GF-0 — Discovery

| Campo | Valor |
|-------|-------|
| **Objetivo** | Validar viabilidade domínio cognitivo; mapear legacy e SSOT |
| **Escopo** | Auditoria read-only; plano arquitectural; **sem código** |
| **Entrada** | BASELINE-SYSTEM actual; ARC-002 aplicável |
| **Saída** | `READY_FOR_{DOMAIN}_GF = YES` |
| **Evidência** | `GF-0xx-{DOMAIN}-DISCOVERY.md` |
| **Testes** | — |
| **Aprovação** | Architecture |

**Referências:** GF-014 (Ishikawa) · INC-036 (Logistics audit)

---

### GF-1 — Runtime Foundation

| Campo | Valor |
|-------|-------|
| **Objetivo** | Z.19 pilot · block pack · flags · registry entry |
| **Escopo** | `cognitiveRuntime/domains/{domain}/` foundation; **sem** promotion |
| **Entrada** | Discovery aprovado |
| **Saída** | `test:{domain}-runtime-foundation` PASS |
| **Evidência** | `GF-0xx-RUNTIME-FOUNDATION.md` · `INC-0xx` plano |
| **Testes** | `test:{domain}-runtime-foundation` |
| **Aprovação** | Engineering + Architecture |

**Referências:** GF-015 · INC-038 (Logistics)

---

### GF-2 — Core Domain

| Campo | Valor |
|-------|-------|
| **Objetivo** | Tabelas · APIs · workflow · semântica SSOT |
| **Escopo** | Domínio bounded context; migration versionada |
| **Entrada** | Runtime foundation PASS |
| **Saída** | `test:{domain}-core-domain` PASS |
| **Evidência** | `GF-0xx-CORE-DOMAIN.md` |
| **Testes** | `test:{domain}-core-domain` |
| **Aprovação** | Engineering |

**Referências:** GF-016 · GF-009 (MSA)

---

### GF-3 — Signal Loader

| Campo | Valor |
|-------|-------|
| **Objetivo** | Z.20 tenant loader · binding · cross-domain bridge |
| **Escopo** | Read-only loader; binding_ratio honesto |
| **Entrada** | Core domain PASS |
| **Saída** | `test:{domain}-signal-loader` PASS · binding documentado |
| **Evidência** | `GF-0xx-SIGNAL-LOADER.md` · binding reconciliation se &lt; gate |
| **Testes** | `test:{domain}-signal-loader` |
| **Aprovação** | Quality review binding |

**Referências:** GF-017 · INC-039 · INC-040

---

### GF-4 — Promotion + Command Center

| Campo | Valor |
|-------|-------|
| **Objetivo** | Z.22 promotion · Z.23 consolidation · CC native promotion |
| **Escopo** | FE hubs lazy · suppress placeholders |
| **Entrada** | Signal loader PASS; binding ≥ gate Z.22 (ou documentado OFF) |
| **Saída** | `test:{domain}-promotion-chain` PASS |
| **Evidência** | `GF-0xx-PROMOTION.md` · `INC-0xx-COMMAND-CENTER` |
| **Testes** | `test:{domain}-promotion-chain` · FE promotion tests |
| **Aprovação** | Homologation técnica |

**Referências:** GF-018 · INC-041 · INC-042

---

### GF-5 — Pilot Enablement

| Campo | Valor |
|-------|-------|
| **Objetivo** | Cenários piloto · perfis · binding target |
| **Escopo** | Dados piloto controlados; flags pilot |
| **Entrada** | Promotion PASS |
| **Saída** | `test:{domain}-pilot-enablement` PASS |
| **Evidência** | `GF-0xx-PILOT-ENABLEMENT.md` |
| **Testes** | `test:{domain}-pilot-enablement` |
| **Aprovação** | Engineering |

**Referências:** GF-019

---

### GF-6 — Homologation

| Campo | Valor |
|-------|-------|
| **Objetivo** | Auditoria read-only cadeia completa Z.19→CC |
| **Escopo** | **Zero** alteração código/PM2/UI |
| **Entrada** | Pilot PASS · ARC-001 PASS |
| **Saída** | `ZERO_*` flags · homologation report |
| **Evidência** | `GF-0xx-*-HOMOLOGATION.md` |
| **Testes** | `test:{domain}-runtime-homologation` · `test:architecture-conformance` |
| **Aprovação** | **Homologation sign-off** |

**Referências:** GF-020 · INC-043

---

### GF-7 — Runtime Baseline + INC + SYSTEM

| Campo | Valor |
|-------|-------|
| **Objetivo** | LOCK baseline domínio · registar no SYSTEM index |
| **Escopo** | Documentação only (Registration INC) |
| **Entrada** | Homologation sign-off |
| **Saída** | `BASELINE-{DOMAIN}-v1.0 = LOCKED` · SYSTEM v1.x |
| **Evidência** | `BASELINE-{DOMAIN}-v1.0.md` · `INC-0xx-ARCHITECTURE-REGISTRATION.md` |
| **Testes** | ARC-001 integrity checks |
| **Aprovação** | **Architecture** |

**Referências:** INC-047

---

## 3. Ciclo Operational Completion Program — fases e gates

### OCP-1 — Foundation (WMS-001)

| Campo | Valor |
|-------|-------|
| **Objetivo** | SSOT · schemas · repos · stubs · flags OFF |
| **Entrada** | AUD read-only · ARC-002 publicado |
| **Saída** | `test:wms-foundation` PASS |
| **Evidência** | `WMS-001-FOUNDATION.md` |

---

### OCP-2 — Compatibility Layer + Core Services (WMS-002)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Legacy Adapter · OCL · serviços reais · proibição acesso legado |
| **Entrada** | WMS-001 PASS · inventário legado formalizado |
| **Saída** | `test:wms-core-services` PASS |
| **Evidência** | `WMS-002-*` · `WMS-LEGACY-WAREHOUSE-INVENTORY.md` |

---

### OCP-3 — Operational APIs (WMS-003)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Endpoints reais · fail-closed · zero mock |
| **Entrada** | WMS-002 PASS |
| **Saída** | `test:wms-api` PASS |
| **Evidência** | `WMS-003-*` |

---

### OCP-4 — Frontend Workspace (WMS-004)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Views operacionais · remoção placeholders |
| **Entrada** | WMS-003 PASS |
| **Saída** | `test:wms-ui` PASS |
| **Evidência** | `WMS-004-*` |

---

### OCP-5 — RBAC + Navigation (WMS-005)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Perfis activos · menu pilot · moduleRegistry |
| **Entrada** | WMS-004 PASS · Platform Stabilization OK |
| **Saída** | RBAC activated documentado |
| **Evidência** | `WMS-005-*` |

---

### OCP-6 — Validation + Operational Baseline (WMS-006)

| Campo | Valor |
|-------|-------|
| **Objetivo** | Pack validation · BASELINE-WMS-v1.0 LOCKED |
| **Entrada** | WMS-005 PASS |
| **Saída** | `test:wms-validation` PASS · `BASELINE-WMS-v1.0 = LOCKED` |
| **Evidência** | `WMS-006-*` · baseline doc |

---

## 4. Gates transversais

| ID | Gate | Quando |
|----|------|--------|
| G-ARC | `test:architecture-conformance` | Pré homologation runtime |
| G-DOC | Evidência fase N antes de fase N+1 | Sempre |
| G-ISO | Cognitivo ⊥ operacional | GF + OCP |
| G-SSOT | Sem duplicação não documentada | OCP especialmente |
| G-AUD | AUD read-only antes de OCP se domínio PARTIAL | AUD-001 modelo |

---

## 5. Referências

- [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)
- [WMS-IMPLEMENTATION-ROADMAP.md](WMS-IMPLEMENTATION-ROADMAP.md)
- [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md)
