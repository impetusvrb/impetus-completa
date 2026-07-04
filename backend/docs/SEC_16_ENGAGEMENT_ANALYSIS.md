# SEC-16 — Engagement Analysis

## Métricas calculadas

| Campo | Descrição |
|-------|-----------|
| `deceptionConfidence` | Confiança na candidatura a decepção (0–1) |
| `attackerPersistence` | Persistência do atacante |
| `interactionDepth` | Profundidade de interacção |
| `scannerSophistication` | Sofisticação do scanner |
| `engagementLevel` | NONE, LOW, MEDIUM, HIGH |

## Inputs

- Incidentes SEC-02
- Dashboard SEC-14 (reputação, fingerprints)
- Dashboard SEC-15 (scanner confidence, attack pattern)
- Cenários de decepção gerados

## Ficheiro

`backend/src/securityThreatDeception/engine/engagementAnalysisService.js`
