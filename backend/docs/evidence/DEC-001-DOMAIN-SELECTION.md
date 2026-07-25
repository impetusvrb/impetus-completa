# DEC-001 — Domain Selection Gate (GF-021)

**Identificador:** `DEC-001`  
**Categoria:** Evolution Decision (EV)  
**Norma:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](../architecture/ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data decisão:** 2026-07-17  
**Modo:** Documentation Only

---

## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| **Categoria** | Evolution Decision (EV) |
| **Objetivo** | Seleccionar domínio oficial GF-021 e autorizar GF-022 Runtime Foundation |
| **Critérios de entrada** | EV-001 READY WITH CONDITIONS · GF-021 COMPLETED · BASELINE-SYSTEM v1.4 LOCKED · ARC-001/002 APPROVED |
| **Critérios de saída** | DOMAIN_SELECTED · documentação GF-021 especializada · placeholders removidos |
| **Impacto arquitetural** | Nenhum (decisão documental) |
| **Baselines afectadas** | Nenhuma — v1.4 preservada |
| **Justificativa de categoria** | EV Decision — gate entre Discovery neutro e implementação; distinto de GF (build) e EV-001 (review) |

---

## Declaração READ ONLY

```
DOCUMENTATION_ONLY                  = YES
CODE_CHANGED                        = NO
DATABASE_CHANGED                    = NO
API_CHANGED                         = NO
UI_CHANGED                          = NO
RUNTIME_CHANGED                     = NO
BASELINE_SYSTEM_v1.4                = PRESERVED
```

---

## Decisão formal

# **DOMAIN = SUPPLY**

| Campo | Valor oficial |
|-------|---------------|
| **Domínio** | Supply (Suprimentos) |
| **Runtime ID** | `supply_native` |
| **Event prefix** | `supply.` |
| **Baseline alvo** | BASELINE-SUPPLY-v2.0 (evolução de v1.0 doc) |
| **Programa Greenfield** | GF-021 → GF-027 |
| **Alternativa rejeitada** | Finance (`finance_native`) — adiada para GF futura |

**Decisor:** Estratégia produto (confirmado via gate DEC-001)  
**Autorização prévia:** [EV-001 Architecture Readiness](../evidence/EV-001-ARCHITECTURE-READINESS.md)

---

## Critérios de avaliação

| Critério | Finance | Supply | Peso |
|----------|:-------:|:------:|:----:|
| Valor para o negócio | Alto (controladoria) | **Alto** (cadeia operacional) | — |
| Independência arquitectural | Média (ERP forte) | **Alta** (domínio próprio) | — |
| Reutilização PPAP | Média | **Alta** (inbound quality) | — |
| Reutilização MSA | Baixa | Média | — |
| Reutilização Ishikawa | Média | **Alta** (excepções fornecedor) | — |
| Dependência WMS | Baixa | **Sinergia alta** (OCL WMS-002) | **Decisivo** |
| Risco técnico | Alto (ERP/contabilidade) | **Médio** | — |
| Complexidade integração | Alta | **Média** | — |
| Prioridade estratégica | Média | **Alta** (WMS + Logistics OCP) | **Decisivo** |
| Baseline existente | Nenhuma | **BASELINE-SUPPLY-v1.0** | — |

**Resultado:** Supply vence em sinergia WMS, eixo operacional alinhado e baseline documental existente.

---

## Opção A — Finance (não seleccionada)

| Campo | Registo |
|-------|---------|
| **Justificativa estratégica** | Ampliar gestão económica, custos industriais, orçamento e KPIs financeiros |
| **Escopo inicial** | Industrial Cost, Budget Variance, Cost Center, Closing Period |
| **Dependências** | ERP (alta), MES (custo ordem), Executive rollup |
| **Impacto arquitectural** | 12º runtime `finance_native`; risco overlap ERP statutory |
| **Estado** | **ADIADO** — candidato GF futura pós Supply ou paralelo v1.6+ |

---

## Opção B — Supply (seleccionada)

| Campo | Registo |
|-------|---------|
| **Justificativa estratégica** | Expandir cadeia operacional procure-to-pay integrada ao WMS e eixo Qualidade |
| **Escopo inicial** | Requisições, PO, performance fornecedor, excepções inbound, spend analytics |
| **Dependências** | WMS/OCL (read), Quality/PPAP (inbound), ERP master data, Logistics cognitive (read) |
| **Impacto arquitectural** | 12º runtime `supply_native`; resolve P-SUP-003; perfil `manager_supply` futuro |
| **Estado** | **APROVADO** — autoriza GF-022 |

---

## Acções executadas

| Acção | Estado |
|-------|:------:|
| Substituir `[DOMÍNIO]` → Supply em GF-021 | ✅ |
| Especializar Discovery | ✅ |
| Especializar Domain Boundary | ✅ |
| Especializar Ubiquitous Language | ✅ |
| Especializar Roadmap | ✅ |
| Actualizar GF-021-DISCOVERY-COMPLETION | ✅ |

---

## Checklist encerramento DEC-001

| Critério | Estado |
|----------|:------:|
| DOMAIN_SELECTED | YES — **SUPPLY** |
| DISCOVERY_SPECIALIZED | YES |
| PLACEHOLDER_REMOVED | YES |
| ROADMAP_UPDATED | YES |
| CODE_CHANGED | NO |
| DATABASE_CHANGED | NO |
| API_CHANGED | NO |
| UI_CHANGED | NO |
| RUNTIME_CHANGED | NO |
| BASELINE_SYSTEM_v1.4 | PRESERVED |
| ARC_001_CONFORMANCE | PRESERVED |
| ARC_002_CONFORMANCE | PRESERVED |

---

## Autorização GF-022

```
GF-022_RUNTIME_FOUNDATION           = AUTHORIZED
DOMAIN                              = SUPPLY
RUNTIME_ID                          = supply_native
PREREQUISITE_DEC_001                = SATISFIED
```

---

## Sequência

```
GF-021 ✅ Discovery (neutro)
    ↓
DEC-001 ✅ Domain = SUPPLY
    ↓
GF-022 Runtime Foundation  ← PRÓXIMO
    ∥
WMS-003 (paralelo)
```

---

*DEC-001 encerrada — 2026-07-17*
