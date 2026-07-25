# IMPETUS-BACKEND-STABILITY-P0-001 — Timeline correlacionada

**Gerado:** 2026-07-14T13:05:00Z  
**Fonte:** PM2 error log, nginx access log, PostgreSQL

## OOM fatal (2 eventos no log actual)

| # | PID | Uptime ~ | Heap GC | Stack fatal | Contexto imediato |
|---|-----|----------|---------|-------------|-------------------|
| 1 | 1531267 | ~7054s (~2h) | 2052→2025 MB Mark-Compact | **JsonParser::ParseJson** | POOL_PRESSURE waitingCount 26-29; OUTBOX_LAG p95 38413ms; MODBUS/MQTT/UNIVERSAL_AUDIT DB timeouts |
| 2 | 1561882 | ~7206s (~2h) | 2014 MB Scavenge fail | **JsonStringifier::Serialize** | POOL_PRESSURE waitingCount 17-26; OUTBOX_LAG burn_rate 3.78; REMINDER/MQTT DB timeouts |

**Estimativa UTC OOM #1:** ~2026-07-14T05:44Z (OBS_ALERT 05:44:38 precede crash)  
**Estimativa UTC OOM #2:** ~2026-07-14T12:21Z+ (OBS_ALERT 12:21:01 precede crash)

## PM2 restarts

- Total restarts no momento da captura: **21**
- Padrão: crash OOM → PM2 autorestart → recuperação temporária ~2h → novo OOM

## Nginx bot-config (sintoma login admin)

| Status | Count | rt típico |
|--------|-------|-----------|
| 504 | 18 | 120s |
| 502 | 2 | 0.000s (backend morto) |
| 200/304 | 9 | <10ms |

## PostgreSQL — industrial_event_outbox (causa disco/PG comprovada)

| Métrica | Valor |
|---------|-------|
| Total rows | **10,690,725** |
| status=delivered | **10,686,710** (12 GB envelopes) |
| status=pending | 1 |
| Tabela total | **28 GB** |
| delivered_at NULL | **0** (archive elegível) |
| Envelope médio (24h) | ~1245 bytes |
| Taxa ingest ~ | ~301k/dia |

## Archive throughput (causa retenção comprovada)

- Scheduler: 1 ciclo/hora (`ARCHIVE_MS=3600000`)
- Batch histórico: **200 rows/ciclo** → **200 rows/hora**
- Taxa ingest >> taxa archive → backlog monótono
- Logs: `[INDUSTRIAL_ARCHIVE] archived:200 deleted:200` (2 ciclos no período recente)

## Disco `/` (97%)

| Path | Tamanho | Classificação |
|------|---------|---------------|
| PostgreSQL PGDATA | ~50 GB | MUST_KEEP (dados prod) |
| `industrial_event_outbox` | 28 GB | MUST_KEEP até archive catch-up |
| `backend/backups/checkpoint_*.sql` | 19 GB | SAFE_TO_ARCHIVE_EXTERNALLY |
| `backend/backups/*.dump` | 2.3 GB | SAFE_TO_ARCHIVE_EXTERNALLY |
| `/var/lib/apport/coredump` | 8.7 GB | SAFE_TO_ARCHIVE_EXTERNALLY |
| PM2 logs rotacionados | ~350 MB | SAFE_TO_DELETE_AFTER_VERIFICATION |
| `storage-remediation/export-staging` | 62 MB | MUST_KEEP (manifest) |

## Flags activas relevantes

- `SECURITY_OBSERVATORY=true`
- `SECURITY_CORRELATION_ENGINE=true`
- `IMPETUS_INDUSTRIAL_OUTBOX_ENABLED=true`
- `IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED=true` / mode `on`
- `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER=true`

## Veredictos de causalidade

| Componente | Veredicto |
|------------|-----------|
| Security Recon | NOT_CAUSAL (incidente login) |
| Archive throughput deficit | **CONFIRMED_ROOT_CAUSE** (disco/PG) |
| SEC-01 unbounded totals | **HIGH_CONFIDENCE_CONTRIBUTOR** (heap gradual) |
| `_safeJson` parse+stringify | **HIGH_CONFIDENCE_CONTRIBUTOR** (JsonParser stack) |
| Pool saturation | **CONTRIBUTOR** (agrava indisponibilidade; OOM precede) |
