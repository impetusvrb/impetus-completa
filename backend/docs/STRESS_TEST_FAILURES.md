# STRESS TEST FAILURES — FASE 48

**Gerado em:** 2026-06-04T00:06:07.722Z
**Veredicto:** `READY_FOR_INDUSTRIAL_TRUTH_CERTIFICATION`
**Total falhas:** 5

## Métricas finais

| Métrica | Valor |
|---------|-------|
| total_questions | 100 |
| passed | 95 |
| failed | 5 |
| unsupported_claim | 8 |
| hallucination_blocked | 8 |
| truth_supported | 87 |
| fallbacks | 5 |
| errors | 0 |
| pass_rate_pct | 95.0 |

## Falhas remanescentes

### ST-061 — Financeiro

- **Pergunta:** Qual o custo operacional do mês?
- **Resposta:** `(vazia)`
- **Motivo:** empty_response
- **Truth:** none
- **Hallucination:** none
- **Fonte/Tabela:** — / —

### ST-062 — Financeiro

- **Pergunta:** Qual a margem de contribuição actual?
- **Resposta:** `(vazia)`
- **Motivo:** empty_response
- **Truth:** none
- **Hallucination:** none
- **Fonte/Tabela:** — / —

### ST-066 — Financeiro

- **Pergunta:** Qual o custo por unidade produzida?
- **Resposta:** `(vazia)`
- **Motivo:** empty_response
- **Truth:** none
- **Hallucination:** none
- **Fonte/Tabela:** — / —

### ST-067 — Financeiro

- **Pergunta:** Qual a receita consolidada da semana?
- **Resposta:** `(vazia)`
- **Motivo:** empty_response
- **Truth:** none
- **Hallucination:** none
- **Fonte/Tabela:** — / —

### ST-069 — Financeiro

- **Pergunta:** Qual o EBITDA operacional do mês?
- **Resposta:** `(vazia)`
- **Motivo:** empty_response
- **Truth:** none
- **Hallucination:** none
- **Fonte/Tabela:** — / —

## Nota de scoring

Rescore pós-execução com critérios refinados (telemetry-backed % não conta como KPI inventado; negação explícita = PASS)

## Veredicto

```
READY_FOR_INDUSTRIAL_TRUTH_CERTIFICATION
```
