# SEC-01 — Observabilidade

## Métricas Prometheus-style (in-process)

| Métrica | Descrição |
|---------|-----------|
| `security_events` | Eventos publicados no bus |
| `classified_events` | Eventos classificados |
| `unknown_events` | Classification UNKNOWN |
| `timeline_entries` | Entradas timeline |
| `security_reports` | Dashboard/audit gerados |
| `security_errors` | Erros internos observatory |

## Métricas agregadas (dashboard)

| Métrica | Descrição |
|---------|-----------|
| `requests_per_minute` | RPM corrente |
| `requests_per_minute_avg` | Média desde boot |
| `unique_ips` | IPs distintos |
| `unique_paths` | Paths distintos |
| `status_distribution` | 200/401/403/404/444 |
| `top_origins` | Top 20 IPs |
| `top_paths` | Top 20 paths |
| `top_user_agents` | Top 15 UA |
| `top_classifications` | Top 10 classes |

## Logs

Prefixo: `[SEC-01]` — apenas boot, errors, flush warnings.

**Não loga cada request** — agregação in-memory.

## Health

Dashboard field `security_health`:
- `nominal`
- `elevated_scan_activity`
- `degraded_classification`
- `observatory_errors`

## Import histórico nginx

```javascript
const sec01 = require('./securityObservatory');
const lines = fs.readFileSync('/var/log/nginx/access.log', 'utf8').split('\n');
sec01.ingest.ingestNginxLines(lines, { force: true });
```

Para reconstituir janela 23:04–02:05 sem activar middleware em produção.
