# tenant_empty — Root Cause Report (Fase 38-B)

**Data:** 2026-06-01  
**Modo:** READ-ONLY — análise de código + evidência Fase 37

---

## Resposta executiva

**Quem gera `data_state = tenant_empty`?**

→ **`dataRetrievalService.classifyDataState()`** quando `machines.length === 0`, exposto em `retrieveContextualData` (`intent: operational_overview`) como `metrics.data_state`.

**Não é gerado por:** `industrialTruthEnforcementService`, `softwareOperationalSnapshotService`, nem directamente por `checkOperationalAvailability`.

---

## 1. Onde `tenant_empty` nasce?

| # | Módulo | Função | Condição |
|---|--------|--------|----------|
| **1 (origem)** | `dataRetrievalService.js` | `classifyDataState({ machines, events })` | `machines.length === 0` → `'tenant_empty'` |
| **2** | `dataRetrievalService.js` | `retrieveContextualData` → `result.metrics` | `data_state: classifyDataState(...)` |
| **3** | `routes/dashboard.js` | `interpretContext({ data_state: pack.metrics.data_state })` | Propaga para `interpretation` |
| **4** | `contextInterpretationLayer.js` | `DECISION_TABLE.tenant_empty` | Briefing: «não possui máquinas cadastradas» |
| **5** | `routes/dashboard.js` | `isNoData = interpretation.data_state === 'tenant_empty'` | Activates `buildNoDataPrompt` |
| **6** | `industrialTruthEnforcementService.js` | `checkOperationalAvailability` | `tenantEmpty` quando `dataState === 'tenant_empty'` → **`has_any_data` efectivo = false** |

**Classificador alternativo (não usado no dashboard chat principal):**

- `dataStateClassifier.classify()` — também `tenant_empty` se `machines.length === 0` (`dataStateClassifier.js:80-81`).
- Usado em testes; **não** invocado no fluxo `operational_overview` do dashboard.

---

## 2. Condições que geram `tenant_empty`

```javascript
// dataRetrievalService.js:47-50
function classifyDataState({ machines = [], events = [] }) {
  if (machines.length === 0) return 'tenant_empty';
  if (machines.length > 0 && events.length === 0) return 'tenant_inactive';
  return 'production_active';
}
```

| Condição | Resultado |
|----------|-----------|
| `machines = []` | **tenant_empty** |
| `machines > 0` e `events = []` | tenant_inactive |
| Caso contrário | production_active |

**Nota:** `events` vêm de `findRecentEvents(company_id)` — **não** de `plc_collected_data`.

---

## 3. Tabelas consultadas na decisão `tenant_empty`

| Dado | Fonte | Tabela(s) |
|------|-------|-----------|
| `machines` | `findMachinesByCompany` | `machine_monitoring_config` → `production_line_machines` → `assets` |
| `events` | `findRecentEvents` | Repositório de eventos operacionais (não PLC raw) |
| **PLC** | **Não consultado** nesta classificação | — |

---

## 4. `plc_collected_data` participa da decisão?

| Caminho | Participa? |
|---------|-----------|
| `classifyDataState` / `metrics.data_state` | **NÃO** |
| `hasOperationalData('telemetria'|'plc')` | **SIM** (COUNT 30d) |
| `softwareOperationalSnapshot.fetchPlcTelemetry` | **SIM** (equipamentos 24h) — **outro pipeline** |
| Prompt dashboard chat (`buildNoDataPrompt`) | **NÃO** — ignora snapshot PLC |

**Paradoxo F37:** `evidence_binding.source_table = plc_collected_data` (truth layer) coexiste com `data_state = tenant_empty` (context layer).

---

## 5. `equipment_id` participa da decisão?

**Não** em `classifyDataState` nem em `findMachinesByCompany`.

`_machineHasRecentActivity` (usado só em `dataStateClassifier`, não no fluxo activo) compara `ev.machine_id` com `machine.id` — requer máquina pré-registada.

---

## 6. `company_id` participa?

**Sim** — todas as queries são scoped por `user.company_id` / `company_id` do tenant.

O problema **não** é multi-tenant; é **fonte de verdade para “máquina existe”** ≠ fonte de telemetria.

---

## Cadeia mapeada (completa)

```
POST /dashboard/chat
  → retrieveContextualData(operational_overview)
      → findMachinesByCompany()  → [] 
      → findRecentEvents()       → (pode ser [])
      → classifyDataState()      → tenant_empty  ★ NASCE AQUI
      → metrics.data_state
  → interpretContext(metrics.data_state)
      → briefing "sem máquinas cadastradas"
  → isNoData → buildNoDataPrompt()
  → enforceTextResponse(..., interpretation.data_state)
      → checkOperationalAvailability(..., dataState: tenant_empty)
      → has_any_data := checks PLC true AND !tenantEmpty → FALSE ★ ANULA PLC
  → LLM: "não existem dados operacionais"
```

---

## Quem NÃO gera `tenant_empty` (esclarecimento)

| Módulo | Papel real |
|--------|------------|
| `checkOperationalAvailability` | **Consome** `data_state`; pode anular `has_any_data` |
| `buildEvidenceBinding` | Reflecte domain_checks (PLC pode ter `has_data: true`) |
| `softwareOperationalSnapshot` | Lê PLC para painel/voz; **não escreve** `metrics.data_state` |
| `voiceRealtimeContextService` | Snapshot software; **sem** `retrieveContextualData` |

---

## Veredito 38-B

| Pergunta | Resposta |
|----------|----------|
| Origem | `dataRetrievalService.classifyDataState` |
| Trigger | `machines.length === 0` |
| PLC ignorado na origem? | **Sim** |
| Truth layer contradiz? | **Parcialmente** (evidence PLC + narrativa empty) |

**Tipo de defeito:** **desacoplamento de registry**, não falha de enforcement.
