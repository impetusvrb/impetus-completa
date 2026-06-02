# Operational Grounding Gap Map (Fase 38-F)

**Data:** 2026-06-01  
**Modo:** READ-ONLY — sem correcções implementadas

---

## Mapa final

```
TELEMETRIA REAL (plc_collected_data, Edge)
        ↓
   equipment_id (LAB-EQ-001, EQ-001…)
        ↓
   ╳ GAP-01 — sem bridge para registry MES
        ↓
   machines[] = []  (findMachinesByCompany)
        ↓
   ╳ GAP-02 — classifyDataState → tenant_empty
        ↓
   metrics.data_state = tenant_empty
        ↓
   ╳ GAP-03 — interpretContext + buildNoDataPrompt
        ↓
   ╳ GAP-04 — checkOperationalAvailability anula has_any_data
        ↓
   IA: "não existem máquinas / dados operacionais"
```

**Paralelo não ligado:**

```
plc_collected_data → softwareOperationalSnapshot (telemetria OK)
                   → ✕ não entra no POST /dashboard/chat
```

---

## GAPs classificados

| ID | Título | Severidade | Causa raiz | Impacto operacional | Risco certificação | Esforço correcção |
|----|--------|------------|------------|---------------------|--------------------|--------------------|
| **GAP-01** | Registry órfão (PLC ≠ MES) | **CRITICAL** | Ingest Edge escreve `plc_collected_data` sem criar/ligar `machine_monitoring_config` | Telemetria invisível ao contexto cognitivo | **INDUSTRIAL CERTIFIED FULL bloqueado** | Médio (sync job ou trigger) |
| **GAP-02** | `classifyDataState` ignora PLC | **CRITICAL** | `dataRetrievalService.js:47-50` só olha `machines`/`events` | `tenant_empty` falso-positivo | Alto | Baixo–médio (estender classificador) |
| **GAP-03** | Dashboard chat sem snapshot PLC | **HIGH** | `/dashboard/chat` não chama `buildSnapshotsForQuery` | LLM sem números reais de telemetria | Alto | Baixo (inject snapshot condicional) |
| **GAP-04** | `tenantEmpty` anula PLC em availability | **HIGH** | `has_any_data && !tenantEmpty` | Evidence contradiz narrativa | Médio | Baixo (lógica condicional) |
| **GAP-05** | `buildNoDataPrompt` nega operação globalmente | **HIGH** | Prompt manda «NÃO existem dados operacionais» | Respostas incorrectas com PLC activo | Alto | Baixo (ramo telemetry_only) |
| **GAP-06** | Dois classificadores de estado | **MEDIUM** | `dataStateClassifier` vs `classifyDataState` | Drift futuro | Médio | Médio (unificar) |
| **GAP-07** | Eventos MES vazios | **MEDIUM** | `findRecentEvents` = 0 | Reforça `tenant_inactive` se houvesse máquinas | Médio | Depende de MES |
| **GAP-08** | OEE completo impossível | **LOW** (dados) | Sem produção/qualidade no PLC | Expectativa KPI errada | Médio | Alto (novos sensores/MES) |

---

## Respostas aos 10 critérios de sucesso

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Por que `tenant_empty` com PLC activo? | `machines=[]` apesar de PLC; classificador não lê telemetria |
| 2 | Quem gera? | `dataRetrievalService.classifyDataState` |
| 3 | Snapshot ignora PLC? | **Não** — chat ignora snapshot |
| 4 | Dependência machine registry? | **Sim** — exclusiva para `data_state` |
| 5 | Dependência cadastro MES? | **Sim** para narrativa; **não** para ingest |
| 6 | `equipment_id` órfão? | **Sim** |
| 7 | OEE calculável hoje? | **Parcial** (utilização); **não** OEE completo |
| 8 | Gargalo INDUSTRIAL CERTIFIED FULL? | **GAP-01 + GAP-02** (registry + classificador) |
| 9 | Tipo de problema? | **Grounding** (integração registry ↔ telemetria ↔ context pack) — não Truth/Hallucination |
| 10 | Correção mínima sem regressões? | Ver secção abaixo |

---

## Correção mínima recomendada (NÃO implementada — F38)

**Opção A — Origem (preferida):**

1. Quando `COUNT(DISTINCT equipment_id)` em `plc_collected_data` (24h) > 0 e `machines.length === 0`, classificar como novo estado **`telemetry_only`** ou `production_paused` em vez de `tenant_empty`.
2. Actualizar `DECISION_TABLE` / `interpretContext` com briefing: «telemetria activa sem cadastro MES completo».

**Opção B — Bridge:**

1. Job idempotente: upsert `machine_monitoring_config` a partir de `DISTINCT equipment_id` PLC (scoped `company_id`).

**Opção C — Disponibilidade:**

1. Em `checkOperationalAvailability`, se domínio PLC `has_data`, não forçar `has_any_data=false` só por `tenant_empty`.

**Opção D — Prompt:**

1. Em `tenant_empty`, se snapshot telemetria > 0, usar prompt misto (não `buildNoDataPrompt` puro) + inject `softwareOperationalSnapshot`.

**Menor risco de regressão:** **A + D** (sem migração de dados obrigatória). **Maior robustez industrial:** **B + A**.

---

## Veredito Fase 38

| Dimensão | Estado |
|----------|--------|
| Root cause identificada | **SIM** |
| Truth / Hallucination / Evidence | **Não são a causa** |
| Grounding operacional | **GAP CRITICAL confirmado** |
| Implementação | **Fora de scope F38** |

**Fase 38 — CONCLUÍDA** (certificação de grounding, read-only).
