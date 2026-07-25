# ARCHITECTURE-CHANGELOG — BASELINE-SYSTEM

**Identificador:** `ARCHITECTURE-CHANGELOG`  
**Última actualização:** 2026-07-17 (ARC-002)  
**Índice mestre actual:** [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md)

---

## Política

Cada entrada representa uma **evolução do índice mestre BASELINE-SYSTEM** ou **governança arquitectural** documental.

**Registration INCs** e **ARCs** não alteram código — apenas documentação e inventário.

---

## Changelog

### GF-023 — Supply Core Domain — 2026-07-17

| Campo | Valor |
|-------|-------|
| **Tipo** | Greenfield Core Domain |
| **Entrega** | Semantics · aggregates · policies · domain services in-memory |
| **BD / API / WMS import** | **NO** |
| **Evidência** | [GF-023-CORE-DOMAIN.md](../evidence/GF-023-CORE-DOMAIN.md) |

---

### GF-022 — Supply Runtime Foundation — 2026-07-17

| Campo | Valor |
|-------|-------|
| **Tipo** | Greenfield Runtime Foundation |
| **Runtime** | `supply_native` v0.1.0 · **FOUNDATION** |
| **Código** | `backend/src/domains/supply/` |
| **Cognitive facade** | **Não anexado** (GF-024+) |
| **WMS** | Integração declarative only |
| **Evidência** | [GF-022-RUNTIME-FOUNDATION.md](../evidence/GF-022-RUNTIME-FOUNDATION.md) |

---

### DEC-001 — Domain Selection Gate (GF-021 = Supply) — 2026-07-17

| Campo | Valor |
|-------|-------|
| **Tipo** | Evolution Decision (EV) · Documentation Only |
| **Decisão** | **DOMAIN = SUPPLY** · `supply_native` |
| **Alternativa adiada** | Finance |
| **Código alterado** | **NO** |
| **Autoriza** | GF-022 Supply Runtime Foundation |
| **Evidência** | [DEC-001-DOMAIN-SELECTION.md](../evidence/DEC-001-DOMAIN-SELECTION.md) |

---

### GF-021 — Supply Discovery — 2026-07-17

| Campo | Valor |
|-------|-------|
| **Tipo** | Greenfield Discovery · Documentation Only |
| **Domínio** | **Supply** · `supply_native` (DEC-001) |
| **Runtime adicionado** | **Nenhum** (Discovery) |
| **Código alterado** | **NO** |
| **Pré-requisito** | EV-001 READY WITH CONDITIONS |
| **Evidência** | [GF-021-DISCOVERY-COMPLETION.md](../evidence/GF-021-DISCOVERY-COMPLETION.md) |

---

### EV-001 — Platform Stabilization Review & Architecture Readiness — 2026-07-17

| Campo | Valor |
|-------|-------|
| **Tipo** | Evolution Review (EV) · Read-Only |
| **Runtime adicionado** | **Nenhum** |
| **SYSTEM version bump** | **Nenhum** (v1.4 preservado) |
| **Código alterado** | **NO** |
| **Gate GF-021** | **READY WITH CONDITIONS** |
| **Evidência** | [EV-001-EXECUTIVE-SUMMARY.md](../evidence/EV-001-EXECUTIVE-SUMMARY.md) |

---

### ARC-002 — Platform Engineering & Delivery Standard — 2026-07-17

| Campo | Valor |
|-------|-------|
| **Tipo** | Architecture Governance · Documentation Only |
| **Runtime adicionado** | **Nenhum** |
| **SYSTEM version bump** | **Nenhum** (v1.4 preservado) |
| **Código alterado** | **NO** |
| **Impacto comportamental** | **Nenhum** |
| **Entrega** | Framework GF + OCP + gates + princípios P-01…P-10 |
| **Evidência** | [ARC-002-COMPLETION.md](../evidence/ARC-002-COMPLETION.md) |
| **Documento principal** | [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md) |

**Delta:** institucionalização processo engenharia; OCP formalizado; taxonomia ampliada (Hotfix · Patch · Audit · ARC).

---

### BASELINE-SYSTEM v1.4 — 2026-07-17

| Campo | Valor |
|-------|-------|
| **INC** | [INC-047-ARCHITECTURE-REGISTRATION.md](../evidence/INC-047-ARCHITECTURE-REGISTRATION.md) |
| **Tipo** | Architecture Registration Only |
| **Runtime adicionado** | `ishikawa_native` |
| **Baseline domínio** | BASELINE-ISHIKAWA-v1.0 (LOCKED) |
| **Greenfield** | GF-014 → GF-020 |
| **Runtimes homologados** | 10 → **11** |
| **Código alterado** | **NO** |
| **Impacto comportamental** | **Nenhum** |
| **ARC-001** | PASS (84 checks) |

**Delta:** inventário oficial inclui Ishikawa como 8º runtime na ordem canónica (entre MSA e Environment). CC Promotion nativa estendida. Loaders Z.20 homologados incluem `ishikawaTenantSignalLoader`.

---

### BASELINE-SYSTEM v1.3 — 2026-07-17

| Campo | Valor |
|-------|-------|
| **INC** | [INC-046-ARCHITECTURE-REGISTRATION.md](../evidence/INC-046-ARCHITECTURE-REGISTRATION.md) |
| **Runtime adicionado** | `msa_native` |
| **Baseline domínio** | BASELINE-MSA-v1.0 |
| **Greenfield** | GF-007 → GF-013 |
| **Runtimes homologados** | 9 → 10 |
| **Código alterado** | NO |

---

### BASELINE-SYSTEM v1.2 — 2026-07-16

| Campo | Valor |
|-------|-------|
| **INC** | INC-045 (PPAP Registration) |
| **Runtime adicionado** | `ppap_native` |
| **Baseline domínio** | BASELINE-PPAP-v1.0 |
| **Greenfield** | GF-000 → GF-006 |
| **Runtimes homologados** | 9 (PPAP registado formalmente) |

---

### BASELINE-SYSTEM v1.1 — 2026-07-16

| Campo | Valor |
|-------|-------|
| **INC** | INC-044 (Consolidation) |
| **Alteração** | Quality + Logistics homologados · inventário 9 runtimes |

---

### BASELINE-SYSTEM v1.0 — 2026-07-15

| Campo | Valor |
|-------|-------|
| **Alteração** | Primeiro índice mestre · runtimes Executive · Production · Maintenance · Environment · HR · SST |

---

## Próxima evolução prevista

| Versão | Pré-requisito | Tipo |
|--------|---------------|------|
| v1.5 | GF Finance ou Supply + homologação | INC Registration |
| — | Consolidação plataforma pós v1.4 | Revisão doc · sem SYSTEM bump |

---

## Referências

- [SYSTEM-RUNTIME-INVENTORY.md](SYSTEM-RUNTIME-INVENTORY.md)
- [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md)
