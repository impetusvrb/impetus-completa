# ManuIA Live — Certificação Operational Truth (Fase 36-B)

**Data:** 2026-06-01  
**Canal:** `POST /api/manutencao-ia/live-assistance/chat`  
**Estado:** **VERIFIED**

---

## Auditoria

| Critério | Antes (F35) | Depois (F36) |
|----------|-------------|--------------|
| Truth Enforcement | Não | Sim (`applyCognitiveTextTruth`) |
| Evidence Binding | Não | Sim (`meta.evidence_binding` → resposta) |
| Audit Trace | Não | Sim (`enqueueCognitiveTrace`, `trace_id`) |
| Caminho sem validação | Resposta LLM directa | Eliminado na rota HTTP |

**Nota:** `analyze-frame` (Gemini visão) e `save-session` não são chat de texto operacional — fora do scope desta certificação de copiloto.

---

## Pipeline

```
generateCopilotReply (OpenAI)
  → finalizeManuIaCopilotReply
      → applyCognitiveTextTruth (channel: manuia_live_assistance)
      → data_lineage
      → enqueueCognitiveTrace
  → JSON { reply, industrial_truth, evidence_binding, trace_id, data_lineage }
```

Paridade conceptual com `finalizeAndDeliverChatReply` do chat interno (Fase 34).

---

## Ficheiros alterados

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/routes/manutencao-ia.js` | Rota `live-assistance/chat` |
| `backend/src/services/cognitiveTruthClosureService.js` | `finalizeManuIaCopilotReply` |

---

## Testes

- Módulo carrega; pipeline reutiliza `industrialTruthEnforcementService` já certificado em tenant vazio (EF-01..EF-05).
- Recomendado: teste manual com dossiê vazio + pergunta «qual o MTBF da linha?» → esperar `UNSUPPORTED_OPERATIONAL_CLAIM` ou mensagem sem dados.

---

## Gaps restantes

- Dossiê JSON do cliente ainda pode conter texto não verificado — truth valida **resposta** do modelo, não revalida todo o dossiê.
- Análise de frame (imagem) sem truth numérico dedicado.

---

## Veredito

**ManuIA Live Chat = VERIFIED**
