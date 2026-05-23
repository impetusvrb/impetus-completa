# Z.22 — Controlled Cognitive Render Promotion

**Referência:** [Auditoria cockpit](./cognitive-cockpit-domain-specialization-audit.md) · [Z.19](./runtime-cognitive-composition-z19.md) · [Z.20](./quality-engine-bridge-z20.md) · [Z.21](./kpi-domain-adapter-z21.md)

## Objectivo

Primeira **promoção de renderização** controlada: o Centro de Comando passa a priorizar widgets quality-native mapeados a blocos cognitivos, com supressão parcial de slots industriais genéricos — **sem** novo CSS, sem rewrite do frontend, sem replace global.

## Pré-requisito

Z.21 `IMPETUS_SPECIALIZED_DELIVERY_ENRICH=enrich` activo (payload enrich antes do render).

## Modos

| Flag | Valor | Efeito |
|------|-------|--------|
| `IMPETUS_COGNITIVE_RENDER_PROMOTION` | `off` | Sem promoção de render |
| | `shadow` | Preview `cognitive_render_promotion_preview` |
| | `controlled` | `widgets_promoted` + `render_active: true` |
| `IMPETUS_QUALITY_RENDER_PROMOTION` | `pilot` | Apenas `coordinator_quality` |

## Mapeamento bloco → widget (existentes)

| Bloco cognitivo | Widget Centro de Comando |
|-----------------|--------------------------|
| `quality.nc_center` | `qualidade` |
| `quality.spc_monitor` | `grafico_tendencia` |
| `quality.capa_engine` | `insights_ia` |
| `quality.nonconformity_heatmap` | `rastreabilidade` |
| `quality.recurrence_analysis` | `kpi_cards` |
| `quality.audit_governance` | `alertas` |
| `quality.contextual_quality_ai` | `pergunte_ia` |

## Payload `/dashboard/me`

```json
{
  "cognitive_render_promotion": {
    "phase": "Z.22",
    "mode": "controlled",
    "promotion_applied": true,
    "render_active": true,
    "widgets_promoted_count": 6,
    "generic_suppressed_count": 2,
    "rollback_snapshot": { "rollback_token": "z22_..." }
  },
  "widgets_promoted": [
    { "id": "qualidade", "render_active": true, "cognitive_block_id": "quality.nc_center" }
  ],
  "widgets_legacy": [ ... ]
}
```

## Frontend

`dashboardContextAdapter` prioridade **0**: `cognitive_render_promotion` + `widgets_promoted` (source: `cognitive_render_promotion`).

## Flags

```env
IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled
IMPETUS_QUALITY_RENDER_PROMOTION=pilot
```

## Testes

```bash
npm run test:render-promotion
```

## Rollback

```env
IMPETUS_COGNITIVE_RENDER_PROMOTION=off
```

`widgets_legacy` e `rollback_snapshot` preservados no payload.

## Invariantes

- `global_replace: false`
- Terminal governance mantido
- Auto-remediation / boundary: **off**
- Componentes React existentes (`WidgetQualidade`, etc.)
