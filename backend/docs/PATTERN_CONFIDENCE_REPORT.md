# Pattern Confidence Report (Fase 45-D)

**Função:** `computePatternConfidence(pattern)`

---

## Significado

`pattern_confidence` (0–100) = robustez estatística da **repetição observada** (ocorrências, janelas, consistência de severidade).

**Não é:** probabilidade de falha, previsão ou score de IA.

---

## Componentes

| Factor | Efeito |
|--------|--------|
| Base | +20 |
| Por ocorrência | +10 (máx. 40) |
| Múltiplas janelas | +8 por janela (≥2 janelas) |
| Severidade consistente | +12 |

Teto: 100.

---

## Exemplo

```json
{
  "pattern_type": "RECURRING_SIGNAL_INSTABILITY",
  "occurrences": 7,
  "windows": ["24h", "7d", "30d"],
  "pattern_confidence": 76,
  "evidence": { "no_prediction": true }
}
```
