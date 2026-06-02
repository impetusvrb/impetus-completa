# Correlation Analysis Report (Fase 43-B)

**Serviço:** `plcCorrelationAnalysisService.buildCorrelationSnapshot()`

---

## Métodos (permitidos)

| Método | Uso |
|--------|-----|
| Pearson | Correlação linear |
| Spearman | Correlação de postos (primária para classificação) |
| Covariância | Evidência adicional no modelo |
| Robusta | Spearman (resistente a outliers) |

---

## Janelas

`24h`, `7d`, `30d` — pares alinhados por `collected_at` (mesma leitura).

---

## Classificação |r| (Spearman)

| Classe | |r| |
|--------|-----|
| none | < 0,20 |
| weak | < 0,40 |
| moderate | < 0,60 |
| strong | < 0,80 |
| very_strong | ≥ 0,80 |

Mínimo: 30 amostras alinhadas; reportar se |r| ≥ 0,15.

---

## Proibido

ML, redes neurais, forecasting, inferência causal automática.
