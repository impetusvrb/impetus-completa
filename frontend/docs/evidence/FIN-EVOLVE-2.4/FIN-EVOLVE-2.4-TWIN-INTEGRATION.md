# FIN-EVOLVE-2.4 — Twin Integration

A integração é uma perspectiva temporal aditiva na view financeira existente. O provider certificado do Twin não foi alterado.

## Lanes

- `observed_fact`: estado económico observado;
- `simulated_scenario`: cenário temporário do What-if;
- `forecast_prediction`: previsão oficial da plataforma.

As lanes são selecionáveis e não são combinadas. A composição declara `mutatesTwin: false`; não cria Twin paralelo e não altera o Twin industrial.

