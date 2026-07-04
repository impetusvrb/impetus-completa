# SEC-14 — Reputation Engine

## Objectivo

Calcular reputação interna por IP baseada **exclusivamente em evidências produzidas pelo IMPETUS** — sem feeds externos.

## Modelo por IP

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `reputationScore` | 0–100 | Score decrescente com incidentes |
| `firstSeen` | ISO8601 | Primeiro incidente relacionado |
| `lastSeen` | ISO8601 | Último incidente relacionado |
| `incidentHistory` | string[] | IDs de incidentes SEC-02 |
| `recurrence` | number | Contagem de incidentes |
| `confidence` | 0–1 | Confiança baseada em volume e severidade |

## Algoritmo (fase 1)

- Score inicial: **100**
- Penalização por severidade: CRITICAL −25, HIGH −18, MEDIUM −10, LOW −5
- Penalização por volume: até −15 conforme `requestCount`
- Recorrência ≥3: −15 adicional; ≥5: −10 adicional
- Score clamped em [0, 100]

## Fontes de dados

- Incidentes abertos e fechados (SEC-02 Correlation)
- Participantes (`participants.ips`) de cada incidente
- Métricas internas (`metrics.requestCount`, tags)

## Limitações

- Sem WHOIS, AbuseIPDB ou listas externas
- Reputação resetada com restart do processo (in-memory)
- Fase posterior pode persistir histórico com aprovação operacional

## Ficheiro

`backend/src/securityAdaptiveBlocking/engine/reputationService.js`
