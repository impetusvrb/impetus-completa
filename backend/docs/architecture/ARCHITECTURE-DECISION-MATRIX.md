# ARCHITECTURE-DECISION-MATRIX — IMPETUS

**Identificador:** `ARCHITECTURE-DECISION-MATRIX`  
**ARC:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data:** 2026-07-17

---

## 1. Matriz principal

| Situação | Processo | Desenvolvimento | Altera SYSTEM index | Altera runtime LOCKED |
|----------|----------|:---------------:|:-------------------:|:---------------------:|
| Novo domínio cognitivo nativo | **Greenfield (GF)** | Sim | Sim (INC registo) | N/A (novo) |
| Completar WMS/MES operacional | **Operational Completion Program (OCP)** | Sim | Opcional (OCP baseline) | **Não** |
| Registar runtime no SYSTEM | **INC** (Registration) | **Não** | Sim | **Não** |
| Alterar Z.19–Z.23 homologado | **INC** (Implementation) | Sim | Possível | **Sim** |
| Padronizar processo engenharia | **ARC** | **Não** | **Não** | **Não** |
| Congelar domínio / plataforma | **Baseline** | **Não** | Documental | Declarativo |
| Funcionalidade sobre LOCKED | **EV** | Sim (aditivo) | **Não** | **Não** |
| Correção emergencial P0 prod | **Hotfix (HF)** | Sim (mínimo) | **Não** | Evitar |
| Bug / melhoria localizada | **Patch (PT)** | Sim (local) | **Não** | **Não** |
| Auditoria diagnóstica | **AUD** | **Não** | **Não** | **Não** |

---

## 2. Árvore de decisão

```
Nova iniciativa?
│
├─ Altera código?
│   ├─ Não → AUD (diagnóstico) | INC (registo) | ARC (governança) | Baseline (doc)
│   └─ Sim →
│       ├─ Emergência produção? → Hotfix
│       ├─ Cria runtime cognitivo novo? → Greenfield (GF)
│       ├─ Completa operacional existente? → OCP (WMS-xxx)
│       ├─ Altera surface LOCKED? → INC (obrigatório)
│       └─ Aditivo sobre LOCKED? → EV ou Patch
│
└─ Só documentação pós-GF? → INC Registration
```

---

## 3. Perguntas orientadoras

| # | Pergunta | Se SIM → | Se NÃO → |
|---|----------|----------|----------|
| Q1 | Cria `{domain}_native` runtime novo? | **GF** | continua |
| Q2 | Altera ficheiros em `cognitiveRuntime/domains/*` LOCKED? | **INC** | continua |
| Q3 | Altera índice BASELINE-SYSTEM? | **INC** Registration | continua |
| Q4 | Implementa WMS/MES/receiving/picking? | **OCP** | continua |
| Q5 | Acede `warehouse_*` sem adapter? | **Bloqueado** — WMS-002 OCL | continua |
| Q6 | Só corrige bug produção crítico? | **Hotfix** | continua |
| Q7 | Adiciona hub/EV sobre Ishikawa LOCKED? | **EV** | continua |
| Q8 | Define norma de engenharia? | **ARC** | continua |

---

## 4. Exemplos históricos validados

| Iniciativa | Classificação | Evidência |
|------------|---------------|-----------|
| PPAP GF-000→006 | GF | INC-045 |
| MSA GF-007→013 | GF | INC-046 |
| Ishikawa GF-014→020 | GF | INC-047 |
| Logistics AUD-001 | AUD | audit/ |
| WMS-001 Foundation | OCP | WMS-001-FOUNDATION |
| WMS-002 OCL (plano) | OCP | WMS-002-OPERATIONAL-COMPATIBILITY-LAYER |
| ARC-001 Conformance | ARC | ARC-001 |
| ARC-002 Delivery Standard | ARC | ARC-002 |
| INC-047 Registration | INC | BASELINE-SYSTEM v1.4 |
| Picking avançado futuro | EV | sobre LOGISTICS ou WMS baseline |

---

## 5. Anti-patterns (bloqueados)

| Anti-pattern | Porquê | Alternativa |
|--------------|--------|-------------|
| GF para completar WMS operacional | Mistura cognitivo + operacional | **OCP** |
| OCP alterando `logistics_native` | Viola Runtime Isolation | Adapter + OCL read export |
| EV alterando Z.22 threshold global | Altera LOCKED | **INC** transversal |
| Implementação sem evidência fase anterior | Viola Documentation First | Emitir doc gate |
| Dual write warehouse + wms sem OCL | Viola SSOT | WMS-002 pattern |

---

## 6. Referências

- [EVOLUTION-TAXONOMY.md](EVOLUTION-TAXONOMY.md)
- [DELIVERY-LIFECYCLE.md](DELIVERY-LIFECYCLE.md)
- [BASELINE-GOVERNANCE.md](BASELINE-GOVERNANCE.md)
