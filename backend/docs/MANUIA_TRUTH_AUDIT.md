# MANUIA_TRUTH_AUDIT — FASE 35C (read-only)

**Data:** 2026-06-01  
**Endpoint:** `POST /api/manutencao-ia/live-assistance/chat`  
**Rota:** `backend/src/routes/manutencao-ia.js` (379-396)  
**Serviço:** `backend/src/services/manuiaLiveAssistanceService.js` → `generateCopilotReply`

---

## Fluxo mapeado

```text
Pergunta (messages[] + dossier opcional)
  ↓
manuiaGuard + apiByUserLimiter
  ↓
generateCopilotReply
  ├─ COPILOT_SYSTEM (governança IMPETUS + regras «não invente»)
  ├─ Dossiê JSON (visão Gemini / pesquisa / OS — se existir)
  └─ ai.chatCompletionMessages (OpenAI gpt-4o-mini)
  ↓
res.json({ ok: true, reply })  — texto livre
```

**Sem:** `industrialTruthEnforcementService`, `cognitiveTruthClosureService`, `enqueueAiTrace`, `data_lineage`.

---

## Questionário obrigatório

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Existe Truth Enforcement? | **NÃO** |
| 2 | Existe Evidence Binding? | **NÃO** |
| 3 | Existe Audit Trace? | **NÃO** |
| 4 | Possibilidade de inventar KPI? | **SIM** — texto livre sem pós-validação |
| 5 | Possibilidade de inventar manutenção? | **SIM** — depende do dossiê; LLM pode extrapolar além do JSON |

---

## Contexto e prompt

| Fonte | Verificável? |
|-------|--------------|
| `dossier` no body | Parcial (Gemini vision, pesquisa interna, OS) |
| `COPILOT_SYSTEM` | Instrui «Use APENAS o dossiê» |
| Billing `companyId` | Sim (tenant) |
| RBAC | `manuiaGuard` |

**Gap:** Não há verificação de que cada afirmação numérica no `reply` existe no dossiê.

---

## Classificação

| Nível | **NOT VERIFIED** |

---

## Nota de segurança operacional

O módulo ManuIA é **assistência de campo** (não dashboard OEE). O risco é **inventar códigos de peça, horas de parada ou KPI de manutenção** não presentes no dossiê — alinhado ao relatório F34 `EVIDENCE_BINDING_AUDIT` (NONE).

**Sem alterações nesta fase.**
