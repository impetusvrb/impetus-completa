# Hazard Heatmap Governance (Z.25)

Centro `safety_hazard_heatmap` (`hazardHeatmapCenter.js`):

- Mapa de risco por setor (proxy `proposals` + breakdown)
- Escalada de risco e zonas críticas
- Hotspots SST e comportamento inseguro (flags de telemetria)

Bridge: `hazardRuntimeBridge.js` → `sst.hazard_heatmap`.

Widget promovido: `rastreabilidade` (slot existente, sem novo componente React).
