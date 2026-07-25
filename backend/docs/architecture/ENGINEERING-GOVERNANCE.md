# ENGINEERING-GOVERNANCE — IMPETUS

**Identificador:** `ENGINEERING-GOVERNANCE`  
**ARC:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data:** 2026-07-17  
**Natureza:** Documentation Only

---

## 1. Propósito

Define **funções** (não pessoas) responsáveis pela evolução controlada da plataforma IMPETUS após BASELINE-SYSTEM v1.4.

---

## 2. Funções oficiais

### 2.1 Architecture

| Responsabilidade | Artefactos |
|------------------|------------|
| Manter índice BASELINE-SYSTEM | `BASELINE-SYSTEM-v1.x.md` |
| Aprovar / emitir INC de registo | `INC-0xx-*` |
| Emitir e manter ARC (governança) | ARC-001 · ARC-002 |
| Decidir GF vs OCP vs EV vs INC | [ARCHITECTURE-DECISION-MATRIX.md](ARCHITECTURE-DECISION-MATRIX.md) |
| Preservar princípios P-01…P-10 | ARC-002 Parte 4 |

**Não faz:** implementação de código operacional ou cognitivo.

### 2.2 Engineering

| Responsabilidade | Artefactos |
|------------------|------------|
| Executar ciclos GF e OCP | `GF-0xx-*` · `WMS-0xx-*` |
| Implementar EV aditivos | `EV-0xx-*` |
| Manter adapters e OCL | `logistics-operational/adapters/` |
| Registar evidências por fase | `docs/evidence/` |

**Obrigação:** referenciar ARC-002 em todo novo programa.

### 2.3 Quality

| Responsabilidade | Artefactos |
|------------------|------------|
| Auditorias read-only | `AUD-0xx-*` |
| Validar ZERO_FAKE_DATA | Homologation reports |
| Gap analysis | `*-GAP-ANALYSIS.md` |
| Recomendar pendências pré-INC/ARC | AUD-001 modelo |

**Não faz:** alterações correctivas durante auditoria.

### 2.4 Homologation

| Responsabilidade | Artefactos |
|------------------|------------|
| Executar gates de saída por fase | Flags binárias nos evidence docs |
| Validar suites de teste mínimas | npm scripts por fase |
| Emitir relatório homologation | `GF-0xx-*-HOMOLOGATION.md` |
| Sign-off read-only quando aplicável | INC-043 · GF-020 modelo |

**Critério:** homologação **não** substitui INC de registo SYSTEM.

### 2.5 Release

| Responsabilidade | Artefactos |
|------------------|------------|
| Gestão feature flags e rollout | `IMPETUS_*` · pilot stages |
| Activar produção **após** baseline + validation | WMS-005 · GF pilot |
| Platform Stabilization Review | Checkpoint pós ARC-002 + OCP parcial |

**Regra:** nenhum runtime cognitivo LOCKED activado em prod sem INC + homologação.

---

## 3. Fluxo de aprovação por tipo

| Tipo | Architecture | Engineering | Quality | Homologation | Release |
|------|:------------:|:-----------:|:-------:|:------------:|:-------:|
| GF fase | Consulta | Executa | Audit opcional | Sign-off fase | — |
| GF homologation | Revisa | Suporta | Audit | **Sign-off** | — |
| INC registo | **Emite** | — | — | — | — |
| OCP fase | Consulta | Executa | AUD pré | Sign-off | — |
| OCP baseline | Revisa | Executa | Audit | **Sign-off** | Pilot |
| ARC | **Emite** | — | — | — | — |
| Hotfix | Aprova escopo | Executa | Verifica | — | **Deploy** |
| Patch | Consulta | Executa | — | — | Deploy |

---

## 4. Escalation

| Situação | Acção |
|----------|-------|
| Alteração proposta em surface LOCKED | Bloquear → exigir **INC** |
| Dual stack sem OCL | Bloquear OCP → exigir WMS-002 pattern |
| Teste ARC-001 FAIL | Bloquear homologation / merge |
| Auditoria IMPLEMENTATION INCOMPLETE | OCP ou EV — **não** GF cognitivo |

---

## 5. Referências

- [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)
- [DELIVERY-LIFECYCLE.md](DELIVERY-LIFECYCLE.md)
- [BASELINE-GOVERNANCE.md](BASELINE-GOVERNANCE.md)
