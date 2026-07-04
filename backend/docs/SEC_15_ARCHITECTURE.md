# SEC-15 — Arquitectura

```
SEC-01 Observatory ──┐
SEC-02 Correlation ──┼──► secAntiScannerCollector (read-only)
SEC-03 Threat Intel ─┤
SEC-14 Adaptive Bl. ─┘
         │
         ▼
   antiScannerEngine
         │
   ┌─────┴─────┬──────────────┬─────────────────┐
   ▼           ▼              ▼                 ▼
scanner    enumeration   scannerConfidence  surfaceProtection
Fingerprint  Detection                        Planner
   │           │              │                 │
   └─────┬─────┴──────────────┴─────────────────┘
         ▼
   anti_scanner_v1 DTO
         ▼
GET /api/audit/security-anti-scanner
```

## Componentes

| Engine | Ficheiro |
|--------|----------|
| Anti-Scanner Engine | `engine/antiScannerEngine.js` |
| Scanner Fingerprint | `engine/scannerFingerprintService.js` |
| Enumeration Detection | `engine/enumerationDetectionService.js` |
| Scanner Confidence | `engine/scannerConfidenceService.js` |
| Surface Protection Planner | `engine/surfaceProtectionPlanner.js` |

## Diretriz

Camada **exclusivamente analítica e consultiva**. Execução (atrasos, honeypots, ocultação dinâmica) fica para fases posteriores após validação operacional.
