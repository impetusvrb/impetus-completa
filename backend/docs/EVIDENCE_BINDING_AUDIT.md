# EVIDENCE_BINDING_AUDIT — FASE 34

**Data:** 2026-06-01  
**Classificação:** FULL | PARTIAL | NONE

---

## Critérios

| Nível | Requisitos |
|-------|------------|
| **FULL** | `evidence_binding` na resposta + lineage ou source metadata + `company_id` + timestamp |
| **PARTIAL** | Alguns campos (ex.: só lineage, ou binding sem persistência) |
| **NONE** | Sem metadata verificável na entrega |

---

## Canais (pós-F34)

| Canal | evidence_binding | data lineage | source metadata | company_id | timestamp | Classificação |
|-------|------------------|--------------|-----------------|------------|-----------|---------------|
| **Dashboard Chat GPT** | ✅ `industrial_truth` em JSON | ✅ `data_lineage` no trace | ✅ `model_info.channel` | ✅ | ✅ trace | **FULL** |
| **Dashboard Chat Council** | ✅ (F34) | ⚠️ trace council sem lineage completo | ✅ | ✅ | ✅ | **PARTIAL** → tende FULL com trace enriquecido |
| **Multimodal** | ⚠️ enforce sem meta no JSON grep | ⚠️ parcial no trace | ✅ module_name | ✅ | ✅ | **PARTIAL** |
| **Chat interno** | ✅ em `output_response.industrial_truth` (F34) | ❌ não lineage dedicado | ✅ trace | ✅ | ✅ | **PARTIAL** |
| **Council API** | ✅ `result.industrial_truth` (F34) | ❌ | ✅ | ✅ | ✅ | **PARTIAL** |
| **Anam voz** | ✅ em shadow `assessment` | ❌ | ✅ audit_logs JSON | ✅ | ✅ audit | **PARTIAL** (shadow only) |
| **OpenAI Realtime** | Igual Anam shadow | ❌ | ✅ channel | ✅ | ✅ | **PARTIAL** |
| **Smart Panel** | ✅ `truth_guard` no payload | ✅ datasets hidratados | ✅ `hydratedDatasets` | ✅ | ✅ snapshot ISO | **PARTIAL** |
| **Claude Panel** | ❌ | ❌ | Prompt snapshot only | ✅ | ❌ | **NONE** |
| **ManuIA live** | ❌ | ❌ | Dossiê JSON | ✅ billing | ❌ | **NONE** |

---

## Implementação de `evidence_binding`

Fonte: `industrialTruthEnforcementService.buildEvidenceBinding`:

```javascript
{
  source_table,
  timestamp: availability.checked_at,
  company_id,
  confidence: 'snapshot_backed' | 'no_operational_data',
  channel,
  data_state
}
```

---

## Melhorias sugeridas (não implementadas F34)

1. Multimodal: incluir `industrial_truth` no `res.json` como dashboard chat.
2. Council trace: injectar `data_lineage` do ramo GPT.
3. Claude panel: `guardPanelVisualizationPayload` ou binding no JSON.

---

## Conclusão

Canais texto fechados na F34 atingem **PARTIAL–FULL**. Voz e painéis visuais secundários permanecem **PARTIAL** ou **NONE**.
