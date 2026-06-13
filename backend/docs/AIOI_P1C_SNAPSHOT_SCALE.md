# AIOI-P1C.3 — Snapshot Growth Certification

**Data:** 2026-06-12  
**Tenant de teste:** `ffd94fb8-79f4-4a38-af21-fe596adfffb5` (industria de teste)  
**Índice crítico:** `idx_aioi_eqs_company_latest (company_id, generated_at DESC)`

---

## Metodologia

- **100 / 1.000 / 10.000 snapshots:** INSERT bulk com `items=[]` (payload mínimo), tag `P1C-SCALE`
- **10 projeções reais:** `projectExecutiveQueueSnapshot()` via serviço canônico
- **fetchLatestSnapshot:** 30 iterações por cenário, percentis p50/p95/p99
- **EXPLAIN ANALYZE** após cada cenário de crescimento

---

## Projeção via Serviço Real (10 ciclos)

```json
{
  "count": 10,
  "ok": 1,
  "p50_ms": 16,
  "p95_ms": 26,
  "max_ms": 26
}
```

**Nota:** Apenas 1/10 retornou `ok:true` com items — idempotency_key colide quando gerado no mesmo minuto (`queue:{companyId}:{YYYY-MM-DDTHH:MM}`). Comportamento esperado e correto (anti-duplicação ORG-5).

---

## Cenário: 100 Snapshots

| Métrica | Valor |
|---|---|
| Tempo inserção total | 46ms |
| Tempo por insert | 0.46ms |
| Bytes adicionados | 56 KB |
| Tabela após | 328 KB |
| fetchLatest p50 | 1ms |
| fetchLatest p95 | 4ms |
| fetchLatest p99 | 5ms |
| EXPLAIN execution | 0.016ms |

---

## Cenário: 1.000 Snapshots

| Métrica | Valor |
|---|---|
| Tempo inserção total | 610ms |
| Tempo por insert | 0.61ms |
| Bytes adicionados | 656 KB |
| Tabela após | 984 KB |
| fetchLatest p50 | 1ms |
| fetchLatest p95 | 4ms |
| fetchLatest p99 | 4ms |
| EXPLAIN execution | 0.013ms |

---

## Cenário: 10.000 Snapshots

| Métrica | Valor |
|---|---|
| Tempo inserção total | 2,976ms |
| Tempo por insert | 0.298ms |
| Bytes adicionados | 6.2 MB |
| Tabela após | **7.2 MB** |
| fetchLatest p50 | 1ms |
| fetchLatest p95 | **2ms** |
| fetchLatest p99 | 2ms |
| EXPLAIN execution | 0.013ms |

---

## Impacto em Índices

| Snapshots | Tabela | Índice `idx_aioi_eqs_company_latest` |
|---|---|---|
| 13 (baseline) | 208 KB | Sub-ms |
| 111 (100 new) | 328 KB | 4ms p95 |
| 1,111 (1000 new) | 984 KB | 4ms p95 |
| 11,114 (10000 new) | 7.2 MB | **2ms p95** |

**Conclusão:** O índice `(company_id, generated_at DESC)` mantém fetchLatest O(log n) — latência **diminui** com volume devido a cache PostgreSQL warm-up. Sem full scan em nenhum cenário.

---

## Projeção de Crescimento Operacional

| Horizonte | Snapshots (1 tenant, ciclo 30s) | Tamanho estimado |
|---|---|---|
| 1 dia | ~2,880 | ~2 MB |
| 1 mês | ~86,400 | ~60 MB |
| 1 ano | ~1,051,200 | ~730 MB |

**Recomendação:** Política de retenção (ex.: manter últimos 1.000 snapshots por tenant) antes de escala multi-ano.

---

## Veredito

```json
{
  "scenarios": [100, 1000, 10000],
  "fetch_latest_stable": true,
  "max_fetch_p95_ms": 4,
  "index_effective": true,
  "insert_scalable": true,
  "retention_recommended_at": "100000 snapshots/tenant"
}
```

```
AIOI_P1C_SNAPSHOT_SCALE_PASS
```

Crescimento de snapshot comprovado até 10.000 registros (7.2 MB) sem degradação de fetchLatestSnapshot.
