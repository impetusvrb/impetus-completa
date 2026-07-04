# SEC-02 — Arquitectura

```mermaid
flowchart TB
  SEC01[SEC-01 Event Bus]
  CE[Correlation Engine]
  IS[Incident Store]
  SEV[Severity Calculator]
  RISK[Risk Score]
  SUM[Summary Builder]
  TL[Incident Timeline]
  AUDIT[GET /api/audit/security-incidents]

  SEC01 -->|subscribe read-only| CE
  CE --> IS
  CE --> SEV
  CE --> RISK
  CE --> SUM
  CE --> TL
  IS --> AUDIT
  SUM --> AUDIT
```

## Princípios

1. Eventos originais **nunca alterados**
2. Evidence = referências (`eventId`)
3. Agrupamento por IP + janela temporal + classificação
4. Determinístico — zero ML/IA generativa
5. In-memory — persistência em SEC-03+

## Chaves de correlação

| Prioridade | Regra |
|------------|-------|
| 1 | Mesmo `source_ip` + incidente OPEN + janela 4h |
| 2 | Mesmo UA + mesma classification + overlap temporal |
