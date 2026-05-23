# Z.25 — SST Native Cognitive Cockpit

**Fase:** Z.25 · **Data:** 2026-05-22  
**Objectivo:** Primeiro cockpit **safety-native** real (replicabilidade da arquitectura Z.23/Z.24).

## Pacote

| Área | Caminho |
|------|---------|
| Domínio SST | `backend/src/cognitiveRuntime/domains/sst/` |
| Blocos | `registry/sstCognitiveBlockPack.js` |
| Piloto | `pilot/safetyCockpitPilot.js` |
| Promoção render | `renderPromotion/safety/` |
| Consolidação | `domains/sst/cockpit/safetyCockpitConsolidator.js` |
| Aplicação | `domains/sst/runtime/safetyCockpitConsolidationRuntime.js` |
| Frontend | `frontend/src/cognitiveRuntime/domains/sst/` |

## Payload `/api/dashboard/me`

```json
{
  "sst_cognitive_runtime": {
    "phase": "Z.25",
    "cockpit_mode": "safety_native",
    "specialization_ratio": 0.0,
    "genericity_ratio": 0.0,
    "render_promoted": true,
    "fallback_preserved": true,
    "safety_cognitive_health": {}
  }
}
```

## Flags

- `IMPETUS_SST_NATIVE_COCKPIT=pilot`
- `IMPETUS_SAFETY_COGNITIVE_RUNTIME=shadow`
- `IMPETUS_SAFETY_RENDER_PROMOTION=controlled`
- `IMPETUS_SAFETY_DENSITY_GOVERNOR=on`
- `IMPETUS_SST_OBSERVABILITY=on`

## Testes

`npm run test:sst-native-cockpit`

## Restrições respeitadas

Sem rewrite React, sem novo dashboard, sem CSS estrutural, sem auto-remediation, sem boundary global, sem replace global de render.
