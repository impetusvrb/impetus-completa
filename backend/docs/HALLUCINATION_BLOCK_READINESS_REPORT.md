# HALLUCINATION_BLOCK_READINESS_REPORT

**Data:** 2026-06-01  
**Estado:** `IMPETUS_HALLUCINATION_DETECTION_MODE=enforce` · `IMPETUS_HALLUCINATION_BLOCK=off` (mantido)

---

## 1. Resumo

A detecção de alucinação V1 está **ativa em modo enforce** (persistência + audit trail), mas o **bloqueio de resposta ao utilizador permanece desligado** por desenho — evita falsos positivos em produção.

**Recomendação formal:** manter `IMPETUS_HALLUCINATION_BLOCK=off` até:

1. Industrial Truth Enforcement estar validado em shadow em tenants piloto (1–2 semanas).
2. Taxa de revisão humana &lt; 15% (SLO `impetus_ai_hallucination_confidence`).
3. Falsos positivos documentados &lt; 5% em amostra de 200 traces.

---

## 2. Configuração atual (evidência)

| Flag | Valor |
|------|-------|
| `IMPETUS_HALLUCINATION_DETECTION` | `enforce` (alias `.env`) |
| `IMPETUS_HALLUCINATION_DETECTION_MODE` | `enforce` |
| `IMPETUS_HALLUCINATION_BLOCK` | **off** |
| `IMPETUS_HALLUCINATION_REVIEW_THRESHOLD` | `0.55` |

Script: `node scripts/verify-hallucination-audit-evidence.js`

### Amostra BD (2026-06-01)

| Métrica | Valor |
|---------|-------|
| Assessments totais | 17 |
| Revisão pendente | 0 |
| Falsos positivos marcados | 0 |
| Confiança média | 0.6337 |
| Eventos audit `hallucination_assessment` | 17 |

---

## 3. Taxa atual de detecção

- **Modo:** enforce — todas as traces elegíveis passam por `hallucinationDetectionService.onTraceAssessed` (hook em `aiAnalyticsService`).
- **Bloqueio síncrono:** 0% (`should_block` sempre false com BLOCK=off).
- **Revisão humana:** fila via `hallucinationReviewQueueService` quando `confidence < 0.55` ou contradições.
- **Indicadores frequentes:** `grounding_failed`, `semantic_weak_overlap`, `sz5_fact_not_reflected` (heurísticos, sem LLM).

---

## 4. Falsos positivos

| Risco | Descrição |
|-------|-----------|
| Resposta educativa válida | Texto longo sem entidades no pack → `semantic_weak_overlap` |
| Números arredondados | Grounding estrito vs. percentagens reformuladas |
| Chat geral | Domínio `general` sem facts SZ5 → cross-check fraco |

**Mitigação em curso:** `industrialTruthEnforcementService` trata claims **numéricos industriais** antes da resposta; Hallucination continua como segunda linha assíncrona.

---

## 5. Impacto esperado se `BLOCK=on`

| Efeito | Severidade |
|--------|------------|
| Respostas substituídas por fallback genérico | Alta em chat operacional |
| Aumento de `requires_human_review` | Média |
| Latência | Baixa (já assíncrono; block seria no próximo turno se implementado sync) |
| Falsos positivos visíveis ao utilizador | Média-alta sem calibragem |

**Nota:** O código atual define `should_block` na assessment mas **não intercepta** HTTP response quando BLOCK=on em todos os canais — ativar BLOCK exige validar hooks síncronos em cada rota (fora do âmbito desta entrega).

---

## 6. Domínios elegíveis para bloqueio futuro

| Domínio | Elegível | Motivo |
|---------|----------|--------|
| `dashboard_chat` | Sim (fase 2) | Trace completo + Truth layer |
| `dashboard_chat_multimodal` | Sim (fase 2) | Após calibragem visão |
| `smart_panel` | Parcial | Payload estruturado; menos texto livre |
| `anam_voice` | Não (fase 3) | Stream realtime; só prompt + Truth appendix |
| Cockpits / Motor A | **Excluído** | Requisito explícito do projeto |
| Workflow / Action runtime | **Excluído** | Requisito explícito |

---

## 7. Critérios de promoção BLOCK=on

1. [ ] `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT` em enforce há ≥ 14 dias sem incidente P1.
2. [ ] Amostra ≥ 200 traces: FP rate &lt; 5%.
3. [ ] Runbook DPO atualizado (`HALLUCINATION_DPO_AUDITOR_EVIDENCE_PACK.md`).
4. [ ] Piloto tenants: `IMPETUS_RUNTIME_UNIFICATION_PILOT_TENANTS` com shadow BLOCK 7 dias.
5. [ ] Aprovação formal QA + Compliance.

---

## 8. Recomendação formal

| Decisão | Ação |
|---------|------|
| **Agora** | Manter `IMPETUS_HALLUCINATION_BLOCK=off` |
| **Agora** | Ativar `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT=on` (síncrono, determinístico) |
| **Q+1** | Piloto `IMPETUS_INDUSTRIAL_TRUTH_MODE=shadow` em 1 tenant |
| **Q+2** | Reavaliar BLOCK=on só para `dashboard_chat` com feature flag por tenant |

---

## 9. Evidências

- `backend/src/services/hallucinationDetectionService.js`
- `backend/docs/HALLUCINATION_DETECTION_V1_REPORT.md`
- `backend/docs/HALLUCINATION_DPO_AUDITOR_EVIDENCE_PACK.md`
- `backend/scripts/verify-hallucination-audit-evidence.js`

**Confirmação:** `IMPETUS_HALLUCINATION_BLOCK` **não foi alterado** nesta entrega.
