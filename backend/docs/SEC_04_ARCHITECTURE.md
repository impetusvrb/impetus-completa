# SEC-04 — Arquitectura

```mermaid
flowchart TB
  BL[SECURITY-BASELINE-01 frozen]
  IE[Integrity Engine]
  HV[Hash Validator]
  RV[Runtime Validator]
  CV[Config Validator]
  FV[Filesystem Validator]
  NV[Network Validator]
  SC[Integrity Score]
  AUDIT[GET /api/audit/security-runtime-integrity]

  BL --> IE
  IE --> HV
  IE --> RV
  IE --> CV
  IE --> FV
  IE --> NV
  HV --> SC
  RV --> SC
  CV --> SC
  FV --> SC
  NV --> SC
  SC --> AUDIT
```

## Princípios

1. Read-only — nunca modifica ficheiros, processos ou config
2. Baseline SECURITY-BASELINE-01 imutável
3. Determinístico — score 0.0–1.0 por regras
4. Poll periódico + check inicial no boot
5. Sem auditd, fail2ban, kill, restart automático
