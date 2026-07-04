# SEC-10 — Pattern Engine

## Padrões detectados

| Padrão | Trigger |
|--------|---------|
| Reconnaissance | classificação RECONNAISSANCE / fallback |
| Credential Scan | CREDENTIAL_SCAN |
| Directory Bruteforce | PATH_ENUMERATION |
| API Enumeration | API_ENUMERATION, API_PROBE |
| Bot Scan | BOT_SCAN, GENERIC_SCAN |
| Cloud Scanner | CLOUD_SCANNER |
| Distributed Scanner | ≥5 IPs ou múltiplos UAs |
| Slow Scan | duração alta + rate baixo |
| Repeated Campaign | tag recurrence |
| Persistent Campaign | duração > 1h + volume |
| Massive Enumeration | ≥10000 requests |

---

## Campanhas

Agrupamento por `classification` com ≥2 incidentes — detecta persistência e recorrência.

---

## Escalation

Composite score baseado em:

- volume · recorrência · aceleração · distribuição · severidade · integridade · padrões

Output: `LOW` | `MEDIUM` | `HIGH` | `CRITICAL`

---

*Determinístico — sem ML nem feeds externos.*
