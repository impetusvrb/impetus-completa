# EVOLUTION-TAXONOMY — Política Oficial de Evolução IMPETUS

**Identificador:** `EVOLUTION-TAXONOMY` (actualização pós ARC-002)  
**Base:** [EVOLUTION-TAXONOMY-v1.0.md](../evidence/EVOLUTION-TAXONOMY-v1.0.md) (LOCKED)  
**Norma de engenharia:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data actualização:** 2026-07-17  
**Índice sistémico:** [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md)  
**Registo:** [INC-047-ARCHITECTURE-REGISTRATION.md](../evidence/INC-047-ARCHITECTURE-REGISTRATION.md) · [ARC-002-COMPLETION.md](../evidence/ARC-002-COMPLETION.md)

---

## Declaração

Este documento **actualiza** a taxonomia oficial após **ARC-002** (Platform Engineering & Delivery Standard). A política v1.0 permanece válida; abaixo registam-se **tipos de iniciativa ampliados**, o **Operational Completion Program (OCP)** e referências ao framework de engenharia.

> **Constituição de processo:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md) — toda nova iniciativa deve referenciá-la.

A separação **INC / GF / EV / OCP** continua **obrigatória**.

---

## Visão geral (pós ARC-002)

```
INC-022 → INC-047   Arquitectura estabilizada · 11 runtimes LOCKED
GF-000 → GF-006     PPAP construído e registado (INC-045)
GF-007 → GF-013     MSA construído e registado (INC-046)
GF-014 → GF-020     Ishikawa construído e registado (INC-047)
ARC-001             Guardião automático (conformidade)
ARC-002             Platform Engineering & Delivery Standard ✅
WMS-001 → …         Operational Completion Program (Logistics)
EV-001+ / GF-021+   Capacidades sobre baseline protegido
```

---

## Taxonomia oficial de iniciativas (ARC-002)

| Tipo | Sigla | Descrição |
|------|-------|-----------|
| **Greenfield** | GF | Novo domínio cognitivo `{domain}_native` |
| **Operational Completion Program** | OCP / WMS | Completar domínio operacional sem alterar runtime LOCKED |
| **Architecture Registration** | INC | Registo / incremento arquitectural |
| **Architecture Governance** | ARC | Padronização · conformidade · sem código |
| **Baseline** | BL | Congelamento LOCKED |
| **Evolution** | EV | Incremento sobre runtime LOCKED |
| **Hotfix** | HF | Emergência produção |
| **Patch** | PT | Correção baixo impacto |
| **Audit** | AUD | Diagnóstico read-only |

---

## INC — Incremento arquitectural

### Subtipos (inalterados)

| Subtipo | Exemplo |
|---------|---------|
| **Implementation INC** | INC-034 Quality homologation |
| **Registration INC** | INC-045 (PPAP) · INC-046 (MSA) · **INC-047 (Ishikawa)** |
| **Consolidation INC** | INC-044 SYSTEM v1.1 |

### Registos SYSTEM

| INC | Runtime | SYSTEM |
|-----|---------|--------|
| INC-045 | `ppap_native` | v1.2 |
| INC-046 | `msa_native` | v1.3 |
| **INC-047** | **`ishikawa_native`** | **v1.4** |

---

## GF — Greenfield

### Sequência canónica

Ver [DELIVERY-LIFECYCLE.md](DELIVERY-LIFECYCLE.md) · [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)

```
Discovery → Runtime Foundation → Core Domain → Signal Loader
  → Promotion → Pilot → Homologation → Runtime Baseline → INC → SYSTEM
```

### Greenfields concluídos — STATUS = COMPLETED

#### PPAP (GF-000 → GF-006)

**Resultado:** `ppap_native` · [BASELINE-PPAP-v1.0.md](../evidence/BASELINE-PPAP-v1.0.md) · INC-045

#### MSA (GF-007 → GF-013)

**Resultado:** `msa_native` · [BASELINE-MSA-v1.0.md](BASELINE-MSA-v1.0.md) · INC-046

#### Ishikawa (GF-014 → GF-020)

**Resultado:** `ishikawa_native` · [BASELINE-ISHIKAWA-v1.0.md](../evidence/BASELINE-ISHIKAWA-v1.0.md) · **INC-047**

### Regras GF (inalteradas)

- Payload isolado — não sobrescrever runtimes parent LOCKED  
- Gate-driven promotion — sem bypass de binding  
- Sem mock / synthetic em runtime homologado  
- Cross-domain regression obrigatória  
- Baseline próprio + INC de registo SYSTEM  

---

## OCP — Operational Completion Program

Formalizado por **ARC-002**. Ciclo: Foundation → OCL → Core Services → APIs → FE → RBAC → Validation → Operational Baseline.

**Instância activa:** [WMS-IMPLEMENTATION-ROADMAP.md](WMS-IMPLEMENTATION-ROADMAP.md) (WMS-001 ✅)

**Regra:** OCP **não** altera runtimes `*_native` LOCKED.

---

## EV — Evolução incremental

Capacidade funcional nova sobre runtime **LOCKED**, **sem** alterar Z.19→Z.23 homologado.

Exemplos pós v1.4: hubs analíticos Ishikawa (EV), extensões PPAP/APQP (EV).

---

## ARC — Architecture Governance

| ARC | Papel |
|-----|-------|
| ARC-001 | Conformance suite executável |
| **ARC-002** | **Platform Engineering & Delivery Standard** |

ARCs **não** alteram código nem SYSTEM index.

---

## Matriz de decisão

Matriz completa: [ARCHITECTURE-DECISION-MATRIX.md](ARCHITECTURE-DECISION-MATRIX.md)

| Pergunta | Resposta → Tipo |
|----------|-----------------|
| Altera Z.19–Z.23 homologado? | **INC** |
| Altera índice BASELINE-SYSTEM? | **INC** (Registration) |
| Cria runtime cognitivo novo? | **GF** (+ INC registo) |
| Completa domínio operacional? | **OCP** |
| Adiciona funcionalidade sobre LOCKED? | **EV** |
| Norma / processo engenharia? | **ARC** |
| Correção emergencial? | **Hotfix** |
| Correção localizada? | **Patch** |
| Auditoria diagnóstica? | **AUD** |

---

## Relação com baselines (v1.4)

| Documento | Papel |
|-----------|-------|
| **BASELINE-SYSTEM v1.4** | Índice mestre — **11 runtimes** homologados |
| **BASELINE-PPAP-v1.0** | Baseline domínio PPAP (LOCKED) |
| **BASELINE-MSA-v1.0** | Baseline domínio MSA (LOCKED) |
| **BASELINE-ISHIKAWA-v1.0** | Baseline domínio Ishikawa (LOCKED) |
| **ARC-001** | Guardião arquitectural pré-merge |
| **ARC-002** | Constituição processo engenharia |
| **BASELINE-GOVERNANCE** | Critérios LOCKED |

---

## Política pós v1.4

> **Arquitectura congelada:** BASELINE-SYSTEM v1.4 · **11 runtimes**  
> **Norma de execução:** **ARC-002** obrigatória para GF · OCP · EV  
> **Novas capacidades cognitivas:** **GF** + INC registo  
> **Novas capacidades operacionais:** **OCP**  
> **Novas INCs:** alteração estrutural ou registo SYSTEM  

### Exemplos futuros

| Trabalho | Classificação |
|----------|---------------|
| Finance Native | **GF** + INC registo |
| Supply Native | **GF** + INC registo |
| WMS Core Services | **OCP** WMS-002 |
| Enriquecer FishboneHub | **EV** ISHIKAWA v1.0 |
| Alterar threshold Z.22 | **INC** transversal |

---

## Referências

| Documento | Relação |
|-----------|---------|
| [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md) | Norma engenharia |
| [DELIVERY-LIFECYCLE.md](DELIVERY-LIFECYCLE.md) | Ciclos e gates |
| [WMS-IMPLEMENTATION-ROADMAP.md](WMS-IMPLEMENTATION-ROADMAP.md) | OCP Logistics |
| [EVOLUTION-TAXONOMY-v1.0.md](../evidence/EVOLUTION-TAXONOMY-v1.0.md) | Política base LOCKED |
| [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md) | Índice mestre |
| [SYSTEM-RUNTIME-INVENTORY.md](SYSTEM-RUNTIME-INVENTORY.md) | Inventário oficial |

---

## Versão

| Versão | Data | Alteração |
|--------|------|-----------|
| v1.0 | 2026-07-16 | Política INC/GF/EV — INC-045 |
| v1.3 ext. | 2026-07-17 | MSA · SYSTEM v1.3 · INC-046 |
| v1.4 ext. | 2026-07-17 | Ishikawa · SYSTEM v1.4 · INC-047 |
| **v1.5 ext.** | **2026-07-17** | **ARC-002 · OCP · HF · PT · AUD** |
