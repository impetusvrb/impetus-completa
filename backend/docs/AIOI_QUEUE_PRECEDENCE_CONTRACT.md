# AIOI_QUEUE_PRECEDENCE_CONTRACT

**Fase:** AIOI-ORG-1 — Queue CEO Consolidation & Sovereignty Resolution  
**Etapa:** 3 — Contrato formal de precedência  
**Data:** 2026-06-09  
**Versão:** 1.0.0  
**Modo:** GOVERNANCE CONSOLIDATION (ADDITIVE ONLY)  
**Token alvo:** `AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS`

---

## 1. Declaração

Este contrato estabelece a **Single Source of Truth** para a Executive Queue do CEO, eliminando ambiguidade entre **F47 Queue** e **AIOI Queue** sem remover funcionalidades existentes e sem ativar runtime cognitivo.

---

## 2. Partes Contratantes

| Parte | Identificador | Status ORG-1 |
|-------|---------------|----------------|
| **F47 Queue** | `operationalPrioritizationService` — `buildOperationalPriorityPack`, `buildOperationalPriorityQueue`, `buildLiveFeedPriorities` | **LEGACY** |
| **AIOI Queue** | `aioi_executive_queue_snapshot` + `GET /api/aioi/queue` | **AUTHORITATIVE** |
| **PLC Priority Score** | `operationalPrioritizationService.computePriorityScore` | **SECONDARY (score soberano, não fila CEO)** |

---

## 3. Regras de Precedência (Q-01 – Q-05)

Herdadas e formalizadas de `AIOI_ANTI_DUPLICATION_POLICY.md` §3:

| Regra | Descrição | Enforcement |
|-------|-----------|-------------|
| **Q-01** | Uma única tela/fonte de fila executiva por empresa — sem listas paralelas | UI + API governance |
| **Q-02** | `IMPETUS_AIOI_ENABLED=true` → UI CEO exibe **AIOI queue** (quando queue ativa) | Feature flag |
| **Q-03** | `IMPETUS_AIOI_ENABLED=false` → UI CEO continua com **F47 packs** | Feature flag |
| **Q-04** | Proibido exibir AIOI queue e F47 packs lado a lado no mesmo dashboard CEO | Code review + auditoria estática |
| **Q-05** | `IMPETUS_AIOI_QUEUE_ACTIVE` controla transição — padrão **`false`** | Feature flag default |

---

## 4. Resolução de Conflito

### 4.1 Quem vence em conflito

| Conflito | Vencedor | Perdedor | Condição |
|----------|----------|----------|----------|
| Ordem de equipamentos CEO | **AIOI Queue** | F47 `priority_queue` | `IMPETUS_AIOI_ENABLED=true` AND `IMPETUS_AIOI_QUEUE_ACTIVE=true` |
| Visão CEO interim (pré-queue AIOI) | **F47 pack** | AIOI queue (não materializada) | Queue AIOI ausente OU flags inativas |
| Score PLC 0–100 | **F47 `computePriorityScore`** | Qualquer recálculo local | Sempre — P-01 a P-05 |
| Matriz estratégica vs fila | **AIOI Queue** (fila) | `aioiExecutivePriorityMatrix` | Matriz nunca substitui fila |

### 4.2 Quem é somente leitura

| Componente | Modo |
|------------|------|
| `GET /api/aioi/queue` | READ ONLY (quando implementada) |
| `aioiExecutiveReadModelService` | READ ONLY |
| `aioiBottleneckAnalysisService` | READ ONLY |
| `aioiCockpitRoutes` | READ ONLY |
| `ExecutiveDashboard.jsx` KPI priorities | READ ONLY (KPI-derived; não fila operacional) |

### 4.3 Quem pode produzir eventos

| Componente | Produção permitida | Condição |
|------------|-------------------|----------|
| **AIOI Executive Queue** (futuro writer) | Snapshot fila CEO cross-domain | Flags ativas + implementação P0.11+ |
| **F47 pack** | `priority_pack`, `priority_queue`, live feed | Sempre (dados internos); display CEO só legacy mode |
| **`plcAioiAdapter`** | IOE + outbox | Sempre; usa F47 score como input |
| **`cognitivePulseService`** | Pulse feed priorities | Legacy mode display |
| **Read models AIOI P2.x** | Agregações | Nunca fila CEO canónica |

### 4.4 Quem pode consumir eventos

| Consumidor | Fonte autorizada | Fonte proibida (quando AIOI active) |
|------------|------------------|-------------------------------------|
| UI CEO (fila operacional) | AIOI queue OU F47 (mutuamente exclusivo) | Ambas simultaneamente |
| `plcAioiAdapter` | F47 scores/packs | — |
| Chat/RAG (`dataRetrievalService`) | F47 pack (legacy) → migrar para AIOI queue read | Dual context sem merge contract |
| Truth enforcement | F47 pack (evidence) | — |
| Cockpit AIOI | Read models + (futuro) AIOI queue | F47 pack direto |

### 4.5 Quem não pode mais produzir (display CEO)

Quando `IMPETUS_AIOI_ENABLED=true` AND `IMPETUS_AIOI_QUEUE_ACTIVE=true`:

| Produtor | Restrição |
|----------|-----------|
| F47 `buildLiveFeedPriorities` → UI CEO | **PROIBIDO** display direto (input only) |
| `dashboard.js` → `operational_priority_queue` CEO | **PROIBIDO** exposição paralela |
| `dataRetrievalService` → fila CEO em chat | **PROIBIDO** sem citar AIOI queue como fonte |
| Novo serviço com ranking CEO local | **PROIBIDO** |

---

## 5. Estados Operacionais

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ESTADO S0 — ATUAL (ORG-1 certificado)                                    │
│   IMPETUS_AIOI_ENABLED:        não codificado (equiv. false)             │
│   IMPETUS_AIOI_QUEUE_ACTIVE:   não codificado (equiv. false)             │
│   Display CEO fila operacional: F47 legacy (de facto)                    │
│   Autoridade declarada:         AIOI Queue (governança)                  │
│   Ambiguidade:                  RESOLVIDA por contrato (não por código)    │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ESTADO S1 — AIOI ENABLED, QUEUE INACTIVE (transição)                     │
│   F47 visível ao CEO; AIOI queue em preparação                           │
│   Sem dual display                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ ESTADO S2 — AIOI ENABLED + QUEUE ACTIVE (alvo operacional)               │
│   AIOI queue = única visão CEO                                           │
│   F47 = LEGACY input via adapter apenas                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Compatibilidade e Preservação

| Requisito | Garantia ORG-1 |
|-----------|----------------|
| APIs existentes (`dashboard`, `dataRetrieval`, pulse) | **Preservadas** — comportamento inalterado em S0 |
| `operationalPrioritizationService` | **Intocado** |
| Adapters P0.2 (`plcAioiAdapter`) | **Intocados** |
| P6 / P7 / P8 providers | **Intocados** |
| Runtime flags | Permanecem `false` |
| Implementação queue AIOI | **Fora escopo** ORG-1 |

---

## 7. Violações e Códigos de Auditoria

| Código | Condição | Severidade |
|--------|----------|------------|
| `DUAL_QUEUE_AUTHORITY` | Dois componentes com status AUTHORITATIVE para fila CEO sem exclusão mútua documentada | **FATAL** |
| `MULTIPLE_QUEUE_SOVEREIGNS` | Mais de um soberano fila CEO no registro de governança | **FATAL** |
| `DUAL_CEO_DISPLAY` | Q-04 violada em UI/API | **CRITICAL** |
| `UNREGISTERED_QUEUE_WRITER` | Novo writer CEO não classificado na matriz | **HIGH** |

---

## 8. Assinatura de Governança

| Campo | Valor |
|-------|-------|
| Autoridade única fila CEO | **AIOI Executive Queue** |
| F47 status | **LEGACY** |
| AIOI Queue status | **AUTHORITATIVE** |
| Classificação | `QUEUE_SINGLE_SOURCE_OF_TRUTH_ESTABLISHED` |
| Certificação ORG-1 | `AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS` |

---

*AIOI_QUEUE_PRECEDENCE_CONTRACT — Etapa 3 AIOI-ORG-1 · contrato de precedência v1.0.0.*
