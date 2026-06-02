# HALLUCINATION_PROMOTION_READINESS — FASE 34

**Data:** 2026-06-01  
**Referência:** [HALLUCINATION_BLOCK_READINESS_REPORT.md](./HALLUCINATION_BLOCK_READINESS_REPORT.md)  
**Restrição:** `IMPETUS_HALLUCINATION_BLOCK` permanece **OFF** — não alterado nesta fase.

---

## 1. Estado dos serviços

| Serviço | Papel | Alterado F34? |
|---------|-------|---------------|
| `hallucinationDetectionService` | Assess assíncrono pós-trace | Não |
| `hallucinationReviewQueueService` | Fila revisão humana | Não |
| `aiAnalytics.enqueueAiTrace` | Hook → `enqueueTraceAssessment` | Não (mais traces nos canais fechados) |

**Efeito colateral F34:** mais canais (chat interno, council) passam a gerar `enqueueAiTrace` → **mais assessments** em shadow/enforce detection.

---

## 2. Critérios do relatório original vs estado

| Critério HALLUCINATION_BLOCK_READINESS | Atendido? | Evidência |
|----------------------------------------|-----------|-----------|
| Industrial Truth validado em piloto | **Em curso** | F34 fechou bypasses texto; voz shadow only |
| Taxa revisão humana &lt; 15% | **Não medido** | Amostra histórica: 0 pendentes / 17 assessments |
| Falsos positivos &lt; 5% em 200 traces | **Não medido** | 0 marcados FP na amostra |
| BLOCK=off em produção | **Sim** | Não alterado |
| Hooks síncronos em todas rotas antes de BLOCK=on | **Não** | BLOCK não intercepta HTTP hoje |

---

## 3. Taxa de confiança / revisão (amostra documentada 33A)

| Métrica | Valor |
|---------|-------|
| Assessments totais | 17 |
| Revisão pendente | 0 |
| Confiança média | ~0.63 |
| `should_block` com BLOCK=off | Sempre false na entrega |

**Pós-F34:** espera-se aumento de volume de traces (chat interno, council API) — recalcular métricas após 1–2 semanas.

---

## 4. Falsos positivos

Indicadores frequentes (relatório anterior): `grounding_failed`, `semantic_weak_overlap`, `sz5_fact_not_reflected`.

**Mitigação reforçada F34:** `industrialTruthEnforcementService` na entrega reduz claims numéricos **antes** da assess assíncrona — deve **diminuir** FP operacionais quando ambos activos.

**Risco residual:** respostas educativas longas sem entidades no pack.

---

## 5. Promover `IMPETUS_HALLUCINATION_BLOCK=on`?

| Veredito | **NÃO recomendado ainda** |
|----------|---------------------------|
| Motivo 1 | Caminhos Claude panel e ManuIA sem truth síncrono |
| Motivo 2 | Voz sem enforce na entrega (só shadow) |
| Motivo 3 | Código BLOCK não bloqueia HTTP em todos canais (nota relatório original) |
| Motivo 4 | Amostra estatística insuficiente pós-F34 |

---

## 6. Próximos passos para promoção (checklist)

- [ ] Executar [EMPTY_FACTORY_CERTIFICATION_PLAN.md](./EMPTY_FACTORY_CERTIFICATION_PLAN.md)
- [ ] 200+ traces pós-F34 com `industrial_truth.action` distribuído
- [ ] Taxa `would_replace` voz &lt; 10% em tenants com dados reais
- [ ] Implementar intercept síncrono BLOCK nos mesmos pontos que `enforceTextResponse`
- [ ] Fechar Claude panel + ManuIA truth
- [ ] Revalidar SLO `impetus_ai_hallucination_confidence`

---

## 7. Conclusão

**Hallucination detection** continua pronta para **audit/enforce assíncrono**. **Promoção de BLOCK** não está pronta — alinhado ao relatório anterior e à F34. A camada de **Industrial Truth** na entrega é agora o primeiro gate nos canais texto fechados; hallucination permanece segunda linha.
