# FIN-EVOLVE-2.4 — Confidence & Explainability

Uma previsão só pode ser exibida quando possui:

- `predicted_value` e `horizon`;
- `confidence_score` entre 0 e 1;
- banda inferior e superior;
- método de confiança;
- referências de evidência;
- origem e contrato;
- limitações;
- trace identificável.

`assessFinancialPredictionDisplayability` aplica este gate no frontend. Resultado incompleto é rejeitado, nunca complementado com mock.

A cadeia certificada permanece:

`Prediction → Confidence → Evidence → Explanation`.

