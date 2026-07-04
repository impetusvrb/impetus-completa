# SEC-05 — Arquitectura

```mermaid
flowchart TB
  SEC02[SEC-02 Incidents]
  SEC03[SEC-03 Threat Profiles]
  SEC04[SEC-04 Integrity]
  NE[Notification Engine]
  AGG[Aggregator]
  CR[Channel Router]
  STORE[Notification Store]
  AUDIT[GET /api/audit/security-notifications]

  SEC02 -->|read-only| NE
  SEC03 -->|read-only| NE
  SEC04 -->|read-only| NE
  NE --> AGG
  AGG --> STORE
  NE --> CR
  CR --> Console
  CR --> StructuredLog
  CR --> Audit
  CR --> Webhook
  CR --> Adapters[Email/Push/SMS stubs]
  STORE --> AUDIT
```

## Princípios

1. Notificação only — nunca bloqueia, reinicia ou remedia
2. Não altera SEC-01→SEC-04
3. Deduplicação determinística por incidentId
4. Adapters externos desacoplados para Wellington/Gustavo (futuro)
