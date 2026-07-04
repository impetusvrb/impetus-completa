# SEC-16 — Arquitectura

```
SEC-14 Adaptive Blocking ──┐
SEC-15 Anti-Scanner ───────┼──► secDeceptionCollector (read-only)
SEC-02 Correlation ────────┘
         │
         ▼
  threatDeceptionEngine
         │
   ┌─────┴─────┬────────────┬──────────────┬─────────────┐
   ▼           ▼            ▼              ▼             ▼
Honeypot   Deception    Engagement    Evidence      Threat
Profiles   Scenarios    Analyzer      Enrichment    Deception
                                                      Planner
         │
         ▼
   threat_deception_v1 DTO
         ▼
GET /api/audit/security-threat-deception
```

## Componentes

| Engine | Ficheiro |
|--------|----------|
| Threat Deception Engine | `engine/threatDeceptionEngine.js` |
| Honeypot Profile Manager | `engine/honeypotProfileService.js` |
| Deception Scenario Engine | `engine/deceptionScenarioService.js` |
| Engagement Analyzer | `engine/engagementAnalysisService.js` |
| Evidence Enrichment | `engine/deceptionEvidenceService.js` |
| Threat Deception Planner | `engine/threatDeceptionPlanner.js` |

## Roadmap pós-SEC-16

**SEC-17** — Exfiltration Detection & Data Protection (prioridade sobre Runtime Lockdown).
