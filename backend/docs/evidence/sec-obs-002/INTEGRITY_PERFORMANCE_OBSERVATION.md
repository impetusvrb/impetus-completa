# INTEGRITY_PERFORMANCE_OBSERVATION.md
## SEC-OBS-002 — Observação de Desempenho

**Fase:** SEC-OBS-002  
**Data:** 2026-07-23  
**Status:** PASS (dentro dos limites arquitecturais do sensor)

---

## 1. Métricas do Motor (state.metrics)

| Métrica | Medido | Limite arquitectural | Status |
|---|---|---|---|
| avg_hash_ms | 0.2 ms | < 50 ms | ✅ |
| p95_hash_ms | 1 ms | < 100 ms | ✅ |
| avg_scan_ms | 8.3 ms | — | ✅ |
| avg_correlation_ms | 1.25 ms | — | ✅ |
| queue_size | 4 | sem crescimento contínuo | ✅ |
| leitura Dashboard avg_read_ms | ~0 ms | < 1–5 ms | ✅ |

---

## 2. Latência Evento → Persistência / Exibição

| Evento | Inject → Detect (events.jsonl) |
|---|---|
| Hash change | ~15 s (intervalo hash 30 s) |
| Perm change | ~12 s (intervalo perm 20 s) |
| File delete | ~21 s |

Nota: latência limitada pelo intervalo de polling configurado para a janela OBS, não pelo custo de processamento.

---

## 3. Memória / CPU do Processo

O campo `heap_mb` / `rss_mb` em `state.metrics` reflecte `process.memoryUsage()` do **backend completo**, não o overhead incremental isolado do sensor.

| Indicador | Valor | Contexto |
|---|---|---|
| rss_mb (processo) | ~273 MB | Envelope PM2 `max_memory_restart=1200M` |
| heap_mb (processo) | ~183 MB | Inclui Express, pools, caches |
| CPU PM2 amostrado | baixo / idle | Sem pico atribuível ao sensor |

Overhead incremental do sensor (INT-01C): ~1–5 MB / <0.1% CPU — confirmado pela estabilidade pós-activação.

**PERFORMANCE_WITHIN_LIMITS = TRUE**

---

## 4. Impacto na Plataforma

| Verificação | Resultado |
|---|---|
| `/api/health` durante operação | 200 |
| Health durante DEGRADED | 200 |
| Crash / restart loop do sensor | Nenhum |
| Necessidade de rollback da flag | Não |
