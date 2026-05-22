# Z.20 — Quality Engine Bridge & Shadow Enrichment

## Objectivo

Ligar o cockpit cognitivo shadow aos **engines reais** de `domains/quality/cognitive/`, substituindo `bridge_status: not_invoked_z19` por dados assistivos reais ou graceful empty.

**Não** altera UX, CSS, nem remove widgets legacy.

## Pacote `bridge/`

| Ficheiro | Função |
|----------|--------|
| `qualityTenantSignalLoader.js` | Sinais reais do tenant (proposals → NC, heatmap, séries) |
| `qualityEngineBridgeRegistry.js` | Mapa block_id → handler + engine_ref |
| `qualityBlockBridgeInvoker.js` | Invocação directa dos engines |
| `shadowEnrichmentPipeline.js` | Enriquece `shadow_cognitive_cockpit.blocks[]` |

## Blocos ↔ Engines

| Block | Engine / fonte |
|-------|----------------|
| `quality.nc_center` | Contagens proposals abertas |
| `quality.capa_engine` | Estimativa CAPA a partir de NC |
| `quality.spc_monitor` | `qualityDriftPredictionEngine` |
| `quality.audit_governance` | `qualityCognitiveAuditEnvelope` |
| `quality.supplier_intelligence` | `qualitySupplierScoringEngine` (se houver dados) |
| `quality.contextual_quality_ai` | `qualityContextualRecommendationEngine` |
| `quality.quality_narrative` | `qualityExecutiveNarrativeEngine` |
| `quality.process_stability` | `qualityProcessDeteriorationEngine` |
| `quality.nonconformity_heatmap` | Agregação por setor (DB) |
| `quality.recurrence_analysis` | `qualityRecurrenceAnalysisEngine` |

## Payload enriquecido

```json
{
  "quality_cockpit_pilot": {
    "enrichment_phase": "Z.20",
    "engine_bridge": {
      "blocks_bound": 7,
      "binding_ratio": 0.875,
      "specialized_delivery_ready": true
    },
    "shadow_cognitive_cockpit": {
      "mode": "shadow_enriched",
      "blocks": [{
        "block_id": "quality.spc_monitor",
        "shadow_signals": {
          "bridge_status": "bound_z20",
          "data_status": "engine_bound",
          "summary": "SPC/drift: medium (conf. 72%)"
        }
      }]
    }
  }
}
```

## Flags

```env
IMPETUS_QUALITY_ENGINE_BRIDGE=shadow
IMPETUS_SHADOW_ENRICHMENT=on
IMPETUS_QUALITY_BRIDGE_DIRECT_ENGINES=on
```

`IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED` pode permanecer **off** — Z.20 usa invocação directa só para shadow.

## Testes

```bash
npm run test:quality-engine-bridge
npm run test:cognitive-composition
```

## Próximo passo

- KPI Domain Adapter (KPIs reais no `/dashboard/kpis` shadow enrich)
- Promoção `shadow → enrich` no payload legacy (sem replace render)
