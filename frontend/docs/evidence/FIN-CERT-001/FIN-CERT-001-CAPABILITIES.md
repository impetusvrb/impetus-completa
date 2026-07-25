# FIN-CERT-001 — Domain Capability Inventory

**Princípio:** `CERTIFY THE DOMAIN, NOT THE RELEASE`

## Operacional

- Finance Workspace e navegação oficial;
- custos industriais (`dashboard.costs`);
- Financial Leakage (`dashboard.financialLeakage`);
- WMS Financial Valuation (`finance.wms_valuation.v1`);
- Nexus Billing, Wallet e Ledger por composição.

## Inteligência Econômica

- Economic Intelligence Engine;
- Smart Costing;
- performance e eficiência econômica;
- custo por unidade, ativo, linha e centro de custo;
- valuation e perdas com trace e evidência.

## Digital Twin

- perspectiva financeira composta sobre o Twin industrial;
- overlay econômico sem Twin paralelo;
- perspectiva temporal com lanes observada, simulada e prevista.

## What-if

- cenários temporários isolados por `scenarioId`;
- comparação baseline × simulado;
- descarte sem persistência ou mutação operacional.

## Predição

- consumidor de `platform.prediction.public_api.v1`;
- oito alvos Wave 1;
- confiança, evidência, limitações e explicação obrigatórias;
- energia excluída da cobertura inicial.

## Governança

- RBAC `VIEW_FINANCIAL`;
- contratos FIN-READY-001;
- gates FIN-VAL-001, PRED-BASE-002 e princípios arquiteturais.

## Observabilidade

- canal `impetus:finance`;
- eventos de Hub, Economic Intelligence, Twin, What-if e Prediction.

O inventário canônico está em `frontend/src/platform/certification/finance/financeDomainCapabilityInventory.js`.

