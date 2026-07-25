# OPS-001 — Build Validation

**Baseline:** BASELINE-SUPPLY-v2.0  
**Git HEAD:** `0f438784c60d7cb7349cf55a133379f2fb647303`  
**Commit date:** 2026-07-14 00:50:25 +0000  
**Dist mtime:** 2026-07-16T00:27:44.115Z

---

| Check | Estado | Observado | Impacto |
| --- | --- | --- | --- |
| dist_index_present | ✅ PASS | /var/www/impetus-completa/frontend/dist/index.html | Build estática publicada |
| wms004_chunks_in_dist | ✅ PASS | 3 | Presença de chunks WMS-004 na build entregue |
| git_commit_available | ✅ PASS | 0f438784c60d7cb7349cf55a133379f2fb647303 | Rastreabilidade commit → implantação |
| frontend_version | ✅ PASS | 1.0.0 | Versão package frontend |
| backend_version | ✅ PASS | 0.1.0 | Versão package backend |

## Chunks WMS-004 em dist

- `LogisticsOperationalLayout-De_Aj_n2.js`
- `LogisticsOperationalWorkspacePage-CmoF0SXX.js`
- `logisticsOperationalFeatureFlags-CngCxdR8.js`

## Release signature (baseline)

- **Stored:** `a7fa921afdf385f61e49bb0d338da9e26b0cc6793f488e2497c76bea9eb913a2`
- **Match:** YES

**Classificação build:** ✅ PASS
