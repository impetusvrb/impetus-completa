# Supplier intelligence (Quality cognitive)

## Motor

`qualitySupplierScoringEngine.js` — reutiliza `buildSupplierScorecard`; compara PPM e score entre metades temporais dos lotes; tendência `worsening|improving|flat`.

## Evento

`quality.cognitive.supplier_score_changed` — quando degradação e limiares PPM/delta (configuráveis).

## Nota

`advisory_only: true` no scorecard base; sem decisão automática sobre fornecedor.
