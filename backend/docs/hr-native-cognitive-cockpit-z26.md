# Z.26 — HR People-Native Cognitive Cockpit

**Fase:** Z.26 · **Padrão:** Z.23 (quality) + Z.25 (safety)

## Pacote

- `backend/src/cognitiveRuntime/domains/hr/`
- `registry/hrCognitiveBlockPack.js`
- `pilot/hrCockpitPilot.js`
- `renderPromotion/hr/`
- `domains/hr/kpi/hrNativeKpiAdapter.js`

## Payload `/api/dashboard/me`

```json
{
  "hr_cognitive_runtime": {
    "phase": "Z.26",
    "cockpit_mode": "hr_native",
    "people_centric": true,
    "hr_cognitive_health": {}
  }
}
```

## Flags

```env
IMPETUS_HR_NATIVE_COCKPIT=pilot
IMPETUS_HR_COGNITIVE_RUNTIME=shadow
IMPETUS_HR_RENDER_PROMOTION=controlled
IMPETUS_HR_DENSITY_GOVERNOR=on
IMPETUS_HR_OBSERVABILITY=on
```

## Testes

`npm run test:hr-native-cockpit`
