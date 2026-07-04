# SEC-17 — Arquitectura

```
SEC-01→04, SEC-14→16 (read-only)
         │
         ▼
 exfiltrationDetectionEngine
         │
   ┌─────┴─────┬────────────┬──────────────┬─────────────┐
   ▼           ▼            ▼              ▼             ▼
Sensitive   Data Movement  Asset Access  Confidence   Timeline
Registry    Analyzer       Profiler      Engine       Builder
         │
         ▼
  dataProtectionPlanner
         │
         ▼
 exfiltration_detection_v1
         ▼
GET /api/audit/security-exfiltration
```

## Componentes

| Engine | Ficheiro |
|--------|----------|
| Exfiltration Detection Engine | `engine/exfiltrationDetectionEngine.js` |
| Sensitive Asset Registry | `engine/sensitiveAssetRegistry.js` |
| Data Movement Analyzer | `engine/dataMovementAnalysisService.js` |
| Asset Access Profiler | `engine/assetAccessProfiler.js` |
| Exfiltration Confidence | `engine/exfiltrationConfidenceService.js` |
| Data Protection Planner | `engine/dataProtectionPlanner.js` |
| Timeline Builder | `engine/exfiltrationTimelineBuilder.js` |

## Próximo

**SEC-18** — Adaptive Runtime Lockdown
