# FIN-EVOLVE-2.4 — Financial Prediction Adapter

O adaptador em `domains/finance/prediction/prediction-adapter/` é consumidor de `platform.prediction.public_api.v1`.

## Fluxo

1. valida o gate PRED-BASE-002;
2. descobre contratos e cobertura da plataforma;
3. consulta exclusivamente `dashboard.forecasting.getProjections`;
4. normaliza com `normalizeForecastToPlatformContract`;
5. contextualiza a tendência certificada com o valor financeiro observado;
6. rejeita resultados incompletos.

A contextualização proporcional não cria tendência: a direção futura e a série temporal são integralmente produzidas pela plataforma corporativa. O domínio não contém motor, treino ou modelo preditivo.

Energia não aparece no catálogo Wave 1 e nunca é solicitada.

