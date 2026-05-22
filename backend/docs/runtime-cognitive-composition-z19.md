# Z.19 — Runtime Cognitive Composition Engine & Quality Cockpit Pilot

**Referência:** [Auditoria Cockpit Cognitivo de Domínio](./cognitive-cockpit-domain-specialization-audit.md) (2026-05-22)

## Objectivo

Primeiro motor real de composição cognitiva + piloto Quality **shadow-only**.

- Monta cockpit de qualidade cognitivamente (backend shadow)
- Compara cockpit genérico vs especializado
- **Não** substitui renderização legacy
- **Não** altera UX/CSS

## Composition Engine

```
composition/
├── runtimeCockpitComposer.js      # orquestrador principal
├── contextualCompositionEngine.js # contexto + elegibilidade + weighting
├── cognitiveBlockResolver.js      # resolve blocos + aliases Z.19
├── operationalWeightResolver.js   # persona 70/20/10 (coordination)
├── cognitiveCompositionScorer.js  # score especializado vs genérico
├── shadowCockpitBuilder.js        # layout shadow + snapshot legacy
└── semanticCompositionValidator.js
```

## Quality Pilot Blocks (oficiais)

| Block ID | Semântica |
|----------|-----------|
| `quality.nc_center` | Centro NC |
| `quality.capa_engine` | CAPA |
| `quality.spc_monitor` | SPC |
| `quality.audit_governance` | Auditorias |
| `quality.supplier_intelligence` | Fornecedores |
| `quality.contextual_quality_ai` | IA contextual |
| `quality.quality_narrative` | Narrativa quality |
| `quality.process_stability` | Estabilidade processo |
| `quality.nonconformity_heatmap` | Heatmap NC |
| `quality.recurrence_analysis` | Reincidência |

Aliases: `quality.supplier_quality` → `supplier_intelligence`, `quality.contextual_ai` → `contextual_quality_ai`

## Payload `/api/dashboard/me` (aditivo)

```json
{
  "cognitive_runtime_report": {
    "quality_cockpit_pilot": {
      "mode": "shadow_only",
      "shadow_cognitive_cockpit": {
        "cockpit_id": "quality_cognitive_pilot_v1",
        "blocks": [{ "block_id": "quality.nc_center", "render_active": false }],
        "layout": { "primary_operational_row": ["quality.nc_center", ...] }
      },
      "cockpit_comparison": {
        "verdict": "specialization_improved",
        "metrics": { "delta_vs_generic": 3.2 }
      }
    }
  }
}
```

## Feature flags

| Flag | Default | Efeito |
|------|---------|--------|
| `IMPETUS_QUALITY_COCKPIT_PILOT` | shadow | Piloto quality |
| `IMPETUS_COGNITIVE_COCKPIT_QUALITY` | shadow | Alias roadmap Fase 4 |
| `IMPETUS_COGNITIVE_COMPOSITION_ENGINE` | off | Motor completo |
| `IMPETUS_COGNITIVE_COMPOSITION_OBSERVABILITY` | on | Composição no report |

## Testes

```bash
npm run test:cognitive-composition
npm run test:cognitive-runtime   # Z.18 foundation
```

## Próximo passo (Z.20+)

- Bridge engines → `shadow_signals.data_status: bound`
- Frontend modular render (feature-flagged)
- Promoção shadow → enrich (sem replace)
