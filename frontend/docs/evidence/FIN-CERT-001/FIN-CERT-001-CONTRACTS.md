# FIN-CERT-001 — Contract Certification

## Contratos obrigatórios

- `finance.driver_rate.v1` — versão `1.0.0`; owner `finance_driver_model`; FIN-READY-001.
- `finance.asset_cost_map.v1` — versão `1.0.0`; owner `finance_asset_cost_map`; FIN-READY-001.
- `finance.wms_valuation.v1` — versão `1.0.0`; owner `finance_wms_valuation`; FIN-READY-001.
- `platform.prediction.public_api.v1` — versão `1`; owner Enterprise Prediction Platform; PRED-BASE-002.

## Contratos complementares

- `platform.prediction.v0` `0.1.0`;
- `dashboard.costs`;
- `dashboard.financialLeakage`;
- `finance.domain.workspace` `1.0.0`;
- `finance.domain.navigation` `1.0.0`;
- `VIEW_FINANCIAL`.

## Parecer

Todos os contratos da baseline possuem origem, proprietário, versão/surface vigente e compatibilidade declarada. Finance não substitui contratos canônicos por cópias e consome a previsão exclusivamente pela API pública certificada.

Validação: `validateFinanceContractCertification()`.

