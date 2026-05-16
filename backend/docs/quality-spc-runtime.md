# Quality — SPC / CEP Runtime

## Âmbito

Implementação **determinística** (sem dashboards cosméticos): subgrupos, limites X-bar (Rbar/d2), regras **Nelson 1** e **Western Electric** (subconjunto 4-de-5), gráficos **P** e **C**, capacidade **Pp/Ppk** (e **Cp/Cpk** com σ_within explícito), anomalias **IQR/Z-score**, tendência linear para **drift**.

## Ficheiros

- `qualitySpcEngine.js` — núcleo estatístico e violações.
- `qualityControlChartEngine.js` — P-chart, C-chart, delegação X-bar.
- `qualityProcessCapabilityEngine.js` — índices de capacidade.
- `qualityStatisticalAnomalyEngine.js` — outliers.
- `qualityTrendAnalysisEngine.js` — regressão linear / drift.

## Limitações conscientes

- X-bar R/S clássicos completos (todos os padrões gráficos) são extensíveis; aqui priorizamos **industrial correctness** do caminho feliz e **violação detectável**.
- Multi-tenant: sem estado no motor — `company_id` apenas no chamador / evento.

## Flags

`IMPETUS_QUALITY_SPC_RUNTIME_ENABLED` — gate da orquestração SPC + publicação de violações.

## Segurança de replay

Resultados são **funções puras** dos inputs; eventos publicados carregam `correlation_id` / payload truncado (limites de tamanho no orchestrator via slice).
