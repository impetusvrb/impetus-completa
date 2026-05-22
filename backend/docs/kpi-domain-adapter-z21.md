# Z.21 — KPI Domain Adapter & Specialized Delivery Enrichment

**Referência:** [Auditoria cockpit cognitivo](./cognitive-cockpit-domain-specialization-audit.md) · [Z.19](./runtime-cognitive-composition-z19.md) · [Z.20](./quality-engine-bridge-z20.md)

## Objectivo

Primeira **promoção controlada** shadow → enrich: o payload principal passa a incluir KPIs, insights e hints quality-native **sem** substituir render React nem remover widgets legacy.

## Modos

| `IMPETUS_SPECIALIZED_DELIVERY_ENRICH` | Comportamento |
|-------------------------------------|---------------|
| `off` | Apenas shadow (Z.19/Z.20) no report |
| `shadow` | Preview `specialized_delivery_preview` sem mutar payload |
| `enrich` | Enriquece `kpis`, `profile_config`, insights, summary |

## Pacote `domainAdapters/`

### Quality

- `qualityKpiAdapter` — KPIs NC, CAPA, SPC, heatmap, conformidade
- `qualitySummaryAdapter` — narrativa `qualityExecutiveNarrativeEngine`
- `qualityInsightAdapter` — recomendações + summaries por bloco
- `qualityCockpitAdapter` — `specialized_cockpit_hints` (cards legacy preservados)
- `qualityContextualQuestionsAdapter` — perguntas contextuais quality
- `qualityOperationalMetricsAdapter` — métricas operacionais agregadas

### Runtime

- `controlledSpecializationRuntime` — orquestra enrich
- `enrichPromotionSupervisor` — elegibilidade (binding_ratio ≥ 0.5)
- `specializedDeliveryAdapter` — artefactos por canal
- `adaptiveFallbackResolver` — fallback para legacy se falhar

## Payload enriquecido (`/dashboard/me`)

```json
{
  "kpis": [ { "id": "quality_open_nc", "title": "NC abertas", "specialized": true }, ... ],
  "kpis_legacy": [ ... ],
  "kpis_specialized": [ ... ],
  "specialized_delivery": {
    "phase": "Z.21",
    "mode": "enrich",
    "promotion_applied": true,
    "genericity_reduction": 0.33,
    "channels_enriched": ["kpis", "cockpit_hints", "insights"]
  },
  "profile_config": {
    "cards": [ ... ],
    "specialized_cockpit_hints": [ { "block_id": "quality.spc_monitor", ... } ]
  }
}
```

## Endpoints

| Rota | Z.21 |
|------|------|
| `GET /api/dashboard/me` | Enrich via `applyCognitiveFoundationToDashboard` |
| `GET /api/dashboard/kpis` | `applySpecializedKpiEnrichment` antes do terminal KPI lock |
| `GET /api/dashboard/smart-summary` | Summary quality-native quando perfil quality |

## Flags

```env
IMPETUS_SPECIALIZED_DELIVERY_ENRICH=enrich
IMPETUS_KPI_DOMAIN_ADAPTER=on
IMPETUS_QUALITY_SUMMARY_ENRICH=on
```

## Testes

```bash
npm run test:specialized-delivery
```

## Invariantes

- Terminal governance (Z.16) aplicado **após** enrich nos KPIs
- `kpis_legacy` sempre preservado para rollback
- `replace_render: false` — sem alteração de layout
- Auto-remediation / boundary: **off**
