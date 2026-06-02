# Explanation Engine Report (Fase 46-A)

**Serviço:** `backend/src/services/operationalExplanationService.js`

---

## Funções

| Função | Descrição |
|--------|-----------|
| `buildOperationalExplanationPack()` | Pacote completo por tenant |
| `buildEventExplanation()` | Explica evento F44 |
| `buildPatternExplanation()` | Explica padrão F45 |
| `buildAttentionExplanation()` | Explica attention_score |
| `buildCorrelationExplanation()` | Explica par correlacionado |
| `buildEvidenceChain()` | Liga a snapshots (nunca texto LLM) |
| `buildOperationalContributionAnalysis()` | Pesos % observáveis |
| `buildOperationalTraceabilityMap()` | Cadeia em 7 passos |
| `formatExplanationsForChat()` | Bloco grounding chat |
| `buildLiveFeedExplanations()` | Feed cognitivo |

---

## Modelo `operational_explanation`

```json
{
  "entity_type": "event",
  "entity_id": "SIGNAL_INSTABILITY",
  "equipment_id": "LAB-EQ-001",
  "explanation_type": "observational",
  "summary": "...",
  "evidence": [],
  "evidence_chain": {},
  "contribution": {},
  "observational_only": true,
  "no_prediction": true,
  "no_causality": true
}
```
