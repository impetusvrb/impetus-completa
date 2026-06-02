# Dashboard Chat Grounding — Fase 39-F

**Data:** 2026-06-01  
**Rota:** `POST /api/dashboard/chat`

---

## Alterações

### 1. Selecção de prompt

| data_state | Prompt |
|------------|--------|
| `tenant_empty` / `tenant_inactive` | `buildNoDataPrompt` (inalterado) |
| **`telemetry_only`** | **`buildTelemetryOnlyPrompt`** (novo) |
| outros | `buildDashboardChatPrompt` |

### 2. Inject PLC mínimo (sem Smart Panel)

Quando `telemetry_only`:

- `plcChatGroundingService.fetchMinimalPlcGroundingSummary(company_id)`
- Campos expostos ao LLM:
  - `equipment_count`
  - `last_collection_at`
  - `active_equipment_ids` (id + name)
  - `alarm_summary` (alarm_state + count)

Formato no turno do utilizador via `formatForUserTurn()` — **sem** OEE, percentagens ou KPIs calculados no servidor.

### 3. Context pack

`retrieveContextualData` → `metrics`:

- `data_state: telemetry_only`
- `plc_grounding_summary`
- `active_equipment_ids`
- `plc_alarm_summary`

---

## Fluxo pós-F39

```
POST /dashboard/chat
  → retrieveContextualData
      → resolveOperationalDataState → telemetry_only
  → interpretContext → briefing telemetria
  → buildTelemetryOnlyPrompt + bloco PLC
  → enforceTextResponse (has_any_data preservado)
  → resposta reconhece LAB-EQ-001, limita OEE
```

---

## Testes RF (find fish) — 2026-06-01

| ID | Pass | Observação |
|----|------|------------|
| RF-01 OEE | ✓ | Limitação OEE + telemetria LAB-EQ-001 |
| RF-02 Produção | ✓ | Reconhece equipamento; não inventa produção |
| RF-03 Equipamentos | ✓ | Lista LAB-EQ-001 |
| RF-04 Alarmes | ✓ | alarm_state ok (sem críticos inventados) |
| RF-05 Telemetria | ✓ | Confirma PLC activo |

---

## Ajuste colateral mínimo

`responseSynthesizer.parseFinalStructuredResponse` — se `content` do LLM for objeto aninhado, extrai string interna (evita `reply: [object Object]`).

---

## Veredito

**Dashboard chat grounding — VERIFIED** para tenant com PLC sem registry MES.
