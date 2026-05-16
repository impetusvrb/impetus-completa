# Quality — Industrial Telemetry Runtime (Etapa 4)

## Objectivo

Runtime **aditivo** para ingestão de telemetria de chão de fábrica no domínio Quality, delegando persistência na fundação WAVE 3 (`telemetryIsolationService`) sem alterar backbone core, observability core nem governance core.

## Flags

| Variável | Default | Notas |
|----------|---------|--------|
| `IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED` | `false` | Portas `/api/quality-telemetry/*` (exceto health metadata em 503 só após gate) — health sempre responde snapshot. |
| `IMPETUS_QUALITY_TELEMETRY_BACKBONE_EVENTS_ENABLED` | `false` | `quality.telemetry.sample_ingested` / `batch_ingested` via `publishQualityIndustrialEvent`. |
| `IMPETUS_QUALITY_TELEMETRY_RANGE_EVENTS_ENABLED` | `true` | Só com `expected_range` válido no body: `quality.telemetry.range_breached` (observação; sem workflow). |
| `IMPETUS_QUALITY_TELEMETRY_SAMPLE_RATIO` | `1` | Amostragem probabilística 0–1 antes de INSERT. |
| `IMPETUS_QUALITY_TELEMETRY_BATCH_MAX` | `200` | Cap por pedido batch (máx. 2000 interno). |
| `IMPETUS_QUALITY_TELEMETRY_PRIMARY_TABLE` | `timeseries` | `timeseries` → `telemetry_timeseries_v1`; `industrial` → `industrial_telemetry_samples`. |

Dependência WAVE 3 (já existente): `IMPETUS_STORAGE_V3_ENABLED` + `IMPETUS_TELEMETRY_ISOLATED_INGEST_ENABLED`.

Frontend (Vite): `VITE_IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED`.

## API tenant (`requireAuth` + empresa activa)

- `GET /api/quality-telemetry/health` — flags + snapshot de dependências.
- `POST /api/quality-telemetry/ingest/v1` — amostra única.
- `POST /api/quality-telemetry/ingest/dimensional` — exige bloco `dimensional` não vazio.
- `POST /api/quality-telemetry/ingest/batch` — corpo `{ samples: [...] }`; um evento `batch_ingested` se backbone activo (por lote), não um `sample_ingested` por linha.

Domínio forçado a `quality`; `company_id` da sessão.

## Contrato / catálogo

- `qualityDomainContract` **v5** — novos eventos listados em `EVENTS`.
- Catálogo: `quality.telemetry.sample_ingested`, `quality.telemetry.batch_ingested`, `quality.telemetry.range_breached`.

## Rollback

Desligar `IMPETUS_QUALITY_TELEMETRY_RUNTIME_ENABLED`. Rotas respondem `503 QUALITY_TELEMETRY_OFF`. Nenhuma alteração a fluxos operacionais ou governança existentes.
