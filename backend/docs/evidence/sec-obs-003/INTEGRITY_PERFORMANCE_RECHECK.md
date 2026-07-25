# INTEGRITY_PERFORMANCE_RECHECK

**Emitido em:** 2026-07-23 17:42 UTC  
**Fase:** SEC-OBS-003  

---

## 1. Métricas de Produção (state.json)

| Métrica | Valor observado | Limite certificado | Status |
|---|---|---|---|
| avg_hash_ms | 0.04 | 50 ms | ✓ |
| avg_scan_ms | 0.81 | 200 ms | ✓ |
| avg_correlation_ms | 1 | 20 ms | ✓ |
| queue_size | 2 | 1000 | ✓ |
| heap_mb (processo) | 1258.38 | ver nota | observacional |
| rss_mb (processo) | 1436.34 | ver nota | observacional |

**Nota:** heap/RSS reflectem o processo Node completo do backend (PM2), não o overhead isolado do sensor. Os tempos médios de hash/scan/correlação permanecem bem abaixo dos limites.

---

## 2. Latências dos Cenários Controlados

| Cenário | Latência típica |
|---|---|
| Perm / UID / GID / delete | < 100 ms |
| Hash (com wait mtime ≥1s) | ~1.1 s (limitação do stat-first, não do hash) |
| Restauração | < 100 ms; 0 eventos fantasmas |

---

## 3. Impacto das INT-LIM

| Alteração | Impacto medido |
|---|---|
| INT-LIM-001 (4 regras auditd) | backlog=0, lost=0 |
| INT-LIM-002 (sem novos watchers) | zero |
| INT-LIM-003 (bloco GID) | ~0.037 ms/activo (medido em INT-LIM-003) |

---

## 4. Conclusão

`PERFORMANCE_WITHIN_LIMITS = TRUE`  
`NO_PERCEPTIBLE_DEGRADATION = TRUE`
