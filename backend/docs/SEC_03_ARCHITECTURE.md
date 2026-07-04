# SEC-03 — Arquitectura

```mermaid
flowchart TB
  SEC02[SEC-02 Incident Store]
  TIE[Threat Intelligence Engine]
  TP[Threat Profile Store]
  CA[Campaign Assessor]
  HI[Historical Intelligence]
  PR[Provider Registry]
  AUDIT[GET /api/audit/security-threat-intelligence]

  SEC02 -->|read-only| TIE
  TIE --> CA
  TIE --> HI
  TIE --> PR
  TIE --> TP
  TP --> AUDIT
```

## Princípios

1. **Nunca altera** Incident DTO SEC-02
2. Threat Profile separado, ligado por `incidentId`
3. Determinístico — regras internas IMPETUS
4. Hipóteses com níveis: Confirmed / Likely / Possible / Unknown
5. Provider registry heurístico (AWS, Vultr, DO, GCP, Azure) — sem API externa

## Bootstrap

SEC-03 faz backfill do SEC-02 store + subscrição read-only ao Event Bus SEC-01 (poll 60s).
