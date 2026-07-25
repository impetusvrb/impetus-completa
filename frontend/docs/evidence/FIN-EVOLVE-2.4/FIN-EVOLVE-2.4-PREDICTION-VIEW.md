# FIN-EVOLVE-2.4 — Prediction View

A rota oficial `/app/finance/prediction` apresenta apenas previsões validadas.

Cada card contém:

- valor atual e previsto;
- tendência;
- horizonte;
- confiança;
- lane `forecast_prediction`;
- acesso ao detalhe da explicação.

Não existe fallback com dados fixos ou aleatórios. Quando a plataforma está indisponível, a UI apresenta estado vazio técnico.

