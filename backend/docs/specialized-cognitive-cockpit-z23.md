# Z.23 — Specialized Cognitive Cockpit Consolidation

**Referência:** [Z.22](./controlled-cognitive-render-promotion-z22.md) · [Z.21](./kpi-domain-adapter-z21.md) · [Auditoria](./cognitive-cockpit-domain-specialization-audit.md)

## Objectivo

Consolidar o cockpit **híbrido** do `coordinator_quality` num cockpit **cognitivo operacional de qualidade** — centros NC, CAPA, SPC, governança, IA contextual — sem rewrite React.

## Pré-requisitos

- Z.21 `enrich` + Z.22 `controlled` render promotion
- Piloto: `coordinator_quality` apenas

## Centros cognitivos

| Centro | Layer | Widget slot |
|--------|-------|-------------|
| `quality_operational_nc` | operational (70%) | `qualidade` |
| `quality_action_capa` | operational | `insights_ia` |
| `quality_telemetry_spc` | operational | `grafico_tendencia` |
| `quality_governance` | governance (20%) | `alertas` |
| `quality_narrative` | strategic (10%) | `insights_ia` |
| `quality_decision_support` | operational | `pergunte_ia` |

## Payload `/dashboard/me`

```json
{
  "specialized_cockpit_runtime": {
    "phase": "Z.23",
    "cockpit_mode": "quality_native",
    "consolidation_applied": true,
    "specialized_ratio": 0.75,
    "generic_ratio": 0.2,
    "operational_focus": 0.67,
    "cognitive_health": {
      "specialization": 0.75,
      "usefulness": 0.82,
      "genericity": 0.2,
      "operational_focus": 0.67,
      "cognitive_density": 0.83
    },
    "fallback_preserved": true
  },
  "quality_cognitive_centers": [ ... ],
  "quality_decision_support": { "questions": [ ... ] }
}
```

## Frontend

Prioridade em `dashboardContextAdapter`: `specialized_cockpit_runtime` → widgets com metadata de centros.

Pacote: `frontend/src/cognitiveRuntime/cockpit/`

## Flags

```env
IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=quality_native
IMPETUS_QUALITY_NATIVE_COCKPIT=pilot
IMPETUS_COGNITIVE_COCKPIT_BALANCER=on
IMPETUS_COCKPIT_DENSITY_GOVERNOR=on
```

## Testes

```bash
npm run test:specialized-cockpit-runtime
```

## Rollback

```env
IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=off
IMPETUS_QUALITY_NATIVE_COCKPIT=off
```

## Invariantes

- `global_replace: false`
- `widgets_legacy` preservado
- Generic collapse (`collapsed_generic`) sem hard delete
- Terminal governance inalterada
