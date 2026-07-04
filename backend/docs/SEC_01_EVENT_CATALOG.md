# SEC-01 — Event Catalog

## Event Types

| Type | Descrição |
|------|-----------|
| `HTTP_SCAN` | Varredura HTTP genérica |
| `ENUMERATION` | Enumeração paths/endpoints |
| `AUTH_ATTEMPT` | Tentativas `/api/auth` |
| `RATE_ANOMALY` | Reservado SEC-02 |
| `USER_AGENT_ANOMALY` | UA suspeito |
| `HEADER_ANOMALY` | Reservado |
| `PATH_DISCOVERY` | Descoberta paths |
| `ASSET_DISCOVERY` | `/assets/*` |
| `BOT_ACTIVITY` | Bots/scanners |
| `SSH_EVENT` | Evento SSH externo |
| `PM2_EVENT` | Evento PM2 externo |
| `FILE_INTEGRITY` | Integridade ficheiro |
| `CONFIG_CHANGE` | Alteração config |
| `PROCESS_CHANGE` | Novo/alterado processo |
| `NETWORK_CHANGE` | Nova porta/listener |
| `TLS_EVENT` | Certificado/TLS |

## Classifications

| Classification | Significado |
|----------------|-------------|
| `BACKGROUND_INTERNET_NOISE` | Volume alto, baixa especificidade |
| `GENERIC_SCANNER` | Scanner automatizado |
| `ENUMERATION` | Mapeamento superfície |
| `CREDENTIAL_SCAN` | `.env`, secrets paths |
| `CRAWLER` | GPTBot, Claude, Googlebot |
| `HEALTH_CHECK` | `/health` |
| `INTERNAL_ACCESS` | localhost |
| `OPERATIONAL_ACCESS` | IP operador trusted |
| `UNKNOWN` | Sem regra match |

## DTO Schema

`security_event_v1` — ver `securityEventDto.js`

Campos agregados: `request_count`, `status_codes`, `bytes_total`, `window_start/end`
