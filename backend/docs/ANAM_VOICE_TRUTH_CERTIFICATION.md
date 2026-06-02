# ANAM_VOICE_TRUTH_CERTIFICATION — FASE 35D

**Data:** 2026-06-01  
**Fonte primária:** `audit_logs` WHERE `action = 'voice_truth_shadow'`  
**Código:** `cognitiveTruthClosureService.assessVoiceTranscriptShadow`, rota `POST /dashboard/voice-truth-shadow-validate`

---

## Estatísticas `audit_logs` (produção actual)

| Métrica | Valor |
|---------|-------|
| **total_assessments** | **0** (antes da certificação directa) |
| **total após teste directo** | **1** (inserção manual certificação) |
| **would_replace** | 0 em BD histórica; **1** no teste directo |
| **would_block** | 0 histórico; **1** no teste (`replace_no_data`) |
| **replace_no_data** | 1 (teste directo) |
| **unsupported_claim** | 0 |
| **confidence média** | N/A (amostra insuficiente) |

**Teste HTTP EF-08:** `404` — endpoint não exposto pelo processo Node em execução (código presente; **reinício PM2 pendente**).

---

## Teste de laboratório (evidência código)

Input simulado (tenant vazio, fala com OEE inventado):

```json
{
  "assistant_text": "O OEE hoje está em 87% na linha 1.",
  "query_text": "OEE hoje"
}
```

Resultado `shadowAssessTextResponse`:

| Campo | Valor |
|-------|-------|
| would_replace | **true** |
| would_block | **true** |
| would_replace_text | «Não existem dados disponíveis para este período.» |
| confidence | **0.28** |
| action | **replace_no_data** |

Audit gravado: `action = voice_truth_shadow` em `audit_logs`.

---

## Perguntas obrigatórias (35D)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Quantas falas seriam substituídas? | **Não mensurável em produção** (0 registos). Em teste: **100%** do caso OEE inventado sem dados. |
| 2 | Quantas falas seriam bloqueadas? | Idem — lógica `would_block` alinhada a `replace_no_data` / `unsupported_claim`. |
| 3 | Taxa would_replace > 10%? | **Indeterminado** (sem volume). Projeção: **alta** em tenant vazio se voz citar KPIs. |
| 4 | Voz pronta para enforce? | **NÃO** — apenas shadow + audit; UX oral inalterada (conforme F34). |

---

## Classificação

| Área | Status |
|------|--------|
| Mecanismo shadow (código) | **PARTIAL** — funciona em serviço |
| Observabilidade produção | **NOT VERIFIED** — 0 amostras até deploy + uso Anam |
| Enforce na entrega falada | **NOT VERIFIED** |

---

## Condições para medição real (≥7 dias)

1. Reiniciar backend com rota `voice-truth-shadow-validate`.
2. Frontend `anamPanelBridge` / `useVoiceEngine` activos (F34).
3. Agregar:

```sql
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE (description::jsonb->>'would_replace')::boolean) AS would_replace,
  ROUND(100.0 * COUNT(*) FILTER (WHERE (description::jsonb->>'would_replace')::boolean) / NULLIF(COUNT(*),0), 2) AS pct_replace
FROM audit_logs
WHERE action = 'voice_truth_shadow'
  AND created_at > NOW() - INTERVAL '7 days';
```

**Sem activar bloqueio. Sem alterar UX/áudio.**
