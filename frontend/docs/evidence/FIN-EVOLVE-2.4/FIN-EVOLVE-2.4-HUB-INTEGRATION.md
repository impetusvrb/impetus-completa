# FIN-EVOLVE-2.4 — Hub Integration

O Hub Finance mantém a composição existente e recebe uma secção aditiva **Previsões financeiras**.

Os cards mostram valor atual, previsto, tendência e confiança, com deep-link para `/app/finance/prediction`. Falha de consulta não interrompe os KPIs, alertas, insights, Twin ou What-if do Hub.

A integração usa o mesmo carregamento de dados reais do Hub e consulta `dashboard.forecasting` por meio do Financial Prediction Adapter.

