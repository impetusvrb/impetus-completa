# SEC-02 — Incident Model

## Schema: `security_incident_v1`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `incidentId` | string | ID único |
| `firstSeen` | ISO8601 | Primeiro evento |
| `lastSeen` | ISO8601 | Último evento |
| `durationMs` | number | Duração |
| `severity` | enum | INFO/LOW/MEDIUM/HIGH/CRITICAL |
| `confidence` | 0–1 | Confiança da correlação |
| `classification` | string | Classificação dominante |
| `timeline` | array | Fases do incidente |
| `participants` | object | ips, userAgents, asns |
| `affectedComponents` | array | api-auth, frontend-assets, etc. |
| `evidence` | array | Refs a eventos SEC-01 (read-only) |
| `status` | enum | OPEN/CLOSED/MERGED |
| `tags` | array | Labels |
| `riskScore` | 0–1 | Score determinístico |
| `summary` | object | Respostas automáticas |
| `metrics` | object | eventCount, requestCount, statusCodes |

## Summary fields

- `what_happened`
- `when_started` / `when_ended`
- `duration_human`
- `event_count` / `request_count`
- `unique_ips`
- `user_agents`
- `services_affected`
- `classification` / `severity` / `risk_score`
