# OPM-E2E-001 — Performance Report

**Data:** 2026-07-19  
**Ambiente:** Node.js (utils puros, sem browser)

---

## Métricas medidas

| Operação | Limiar (ms) | Descrição |
|----------|-------------|-----------|
| Receiving grid (100 linhas) | ≤ 80 | `buildReceivingRows` |
| Picking grid (100 linhas) | ≤ 80 | `buildPickingRows` |
| Shipping grid (100 linhas) | ≤ 80 | `buildShippingRows` |
| Inventory timeline (500 mov.) | ≤ 120 | `buildInventoryTimeline` |
| Filtros combinados (100 linhas) | ≤ 40 | search + status filter |

---

## Metodologia

Benchmarks executados via `opmE2e001PerformanceBench.js`:

- 5 iterações por operação de grid/timeline
- 10 iterações por filtro
- Média reportada no teste

---

## Execução

```bash
npm run test:opm-e2e-001
```

O teste `performance — grids, timeline e filtros` reporta valores reais no output.

---

## Notas

- Medição em ambiente Node — representa performance de transformação de dados, não render React.
- Render inicial e exportação PDF/Excel validados estruturalmente (componentes WMS-REF-001 presentes).
- Benchmarks servem como baseline antes de OPM-006 (Transfer) que aumentará volume de movimentações.

---

## Resultado

**APROVADO** — todas as métricas dentro dos limiares definidos em `E2E_PERF_THRESHOLDS_MS`.
