# Estado `telemetry_only` — Fase 39-A

**Data:** 2026-06-01

---

## Definição

| Campo | Valor |
|-------|--------|
| **Constante** | `telemetry_only` |
| **Quando** | `machines.length === 0` **e** `COUNT(DISTINCT equipment_id)` em `plc_collected_data` (24h) **> 0** |
| **Quando não** | Sem PLC recente → permanece `tenant_empty` |

---

## Lógica implementada

Ficheiro: `backend/src/services/dataRetrievalService.js`

```javascript
async function resolveOperationalDataState(companyId, { machines, events }) {
  if (machines.length > 0) return { data_state: classifyDataState({ machines, events }), ... };
  const plc = await plcChatGroundingService.countDistinctPlcEquipment(companyId);
  if (plc.distinct_equipment > 0) return { data_state: 'telemetry_only', plc_grounding: plc };
  return { data_state: 'tenant_empty', plc_grounding: plc };
}
```

Serviço auxiliar: `backend/src/services/plcChatGroundingService.js`

---

## Interpretação contextual

`backend/src/ai/contextInterpretationLayer.js` — `DECISION_TABLE.telemetry_only`:

- **narrative_mode:** `telemetry_limited`
- **Briefing:** telemetria activa, cadastro MES incompleto, não negar operação
- **Frases proibidas:** inclui «não existem dados operacionais», «sistema vazio», etc.

---

## Prompt

`backend/src/ai/prompts/telemetryOnlyModePrompt.js` — `buildTelemetryOnlyPrompt()`

**Não** usa `buildNoDataPrompt()` quando `data_state === telemetry_only`.

---

## Evidence binding

`industrialTruthEnforcementService.buildEvidenceBinding()`:

```json
{
  "source_table": "plc_collected_data",
  "confidence": "snapshot_backed",
  "data_state": "telemetry_only",
  "telemetry_only": true
}
```

---

## Validação (find fish)

| Tenant | `resolveOperationalDataState` |
|--------|-------------------------------|
| find fish alimentos | `telemetry_only` (1 equipamento 24h) |
| Fresh & Fit (vazio) | `tenant_empty` (0 equipamento) |

---

## Veredito

**Estado operacional `telemetry_only` — IMPLEMENTADO e VALIDADO**
