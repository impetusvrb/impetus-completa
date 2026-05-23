# Cockpit density governor (Z.23)

`cockpitDensityGovernor.js` limita:

- Centros activos (`IMPETUS_Z23_MAX_CENTERS`, default 6)
- Métricas por centro (`IMPETUS_Z23_MAX_METRICS_PER_CENTER`, default 8)
- Widgets no layout (max 8)

Log: `density.overload_detected` quando caps aplicados.
