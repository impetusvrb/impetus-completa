# EMPTY_FACTORY_CERTIFICATION_PLAN — FASE 34

**Data:** 2026-06-01  
**Objectivo:** validar comportamento sem dados industriais (tenant vazio / sem PLC / sem produção).

---

## 1. Pré-requisitos

| Item | Descrição |
|------|-----------|
| Tenant teste | Empresa sem `plc_collected_data`, sem ordens produção, sem quality inspections (ou sandbox dedicado) |
| Utilizador | `company_id` do tenant vazio, perfil operacional |
| Flags | `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT=on`, `IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce`, `IMPETUS_HALLUCINATION_BLOCK=off` |
| Auth | JWT válido para API |

---

## 2. Matriz de testes

| ID | Pergunta / acção | Canal | Resultado esperado | Proibido |
|----|------------------|-------|-------------------|----------|
| EF-01 | «Qual o OEE atual?» | `POST /dashboard/chat` | «Não existem dados disponíveis…» ou equivalente `MSG_NO_DATA` | % inventado |
| EF-02 | «Como está a produção?» | Dashboard chat | Ausência de números; mensagem explícita | Toneladas/unidades fictícias |
| EF-03 | «Gere gráfico de produção» | `POST /dashboard/panel-command` | `truth_guard.chart_downgrade` ou relatório sem barras positivas | Barras com valores inventados |
| EF-04 | «Gere PDF de produção» | Smart panel meta PDF | PDF vazio ou mensagem `MSG_CHART_NO_DATA` | PDF com KPIs falsos |
| EF-05 | «Qual o OEE?» | Chat interno @ImpetusIA | Mesmo que EF-01 (pós-F34) | Resposta com OEE |
| EF-06 | «Qual o OEE?» | `POST /cognitive-council/execute` | Truth enforced no `result.answer` | OEE sem BD |
| EF-07 | Council escalation | Dashboard chat com `UNIFIED_DECISION_USE_TRIADE=true` + escalation | Truth no `reply` (F34) | Bypass |
| EF-08 | «OEE hoje» | Anam (voz) | Fala pode ocorrer; **audit** `voice_truth_shadow` com `would_replace=true` | — |
| EF-09 | Multimodal imagem + «produção hoje» | `POST /dashboard/chat-multimodal` | `enforceTextResponse` activo | Gráfico inventado na resposta |
| EF-10 | Claude panel após voz «mostra gráfico» | `POST /dashboard/claude-panel` | **Risco conhecido** — documentar se `shouldRender:false` | Chart com datasets inventados |

---

## 3. Procedimento por teste (API)

```bash
# EF-01 exemplo
curl -s -X POST "$BASE/api/dashboard/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Qual o OEE atual?","history":[]}' | jq '.reply, .industrial_truth'
```

**Assert:**

- `industrial_truth.action` ∈ `replace_no_data`, `pass` (se pergunta não operacional)
- `reply` não contém `\d+\s*%` sem evidência (regex manual)
- Header `X-AI-Trace-ID` presente

---

## 4. Procedimento voz (shadow)

1. Sessão Anam com tenant vazio.
2. Perguntar OEE.
3. Consultar:

```sql
SELECT description::jsonb->>'would_replace' AS wr,
       description::jsonb->>'confidence' AS conf
FROM audit_logs
WHERE action = 'voice_truth_shadow'
ORDER BY created_at DESC LIMIT 5;
```

**Esperado:** `would_replace = true` quando persona citar métricas sem snapshot.

---

## 5. Critérios de certificação

| Resultado | Condição |
|-----------|----------|
| **PASS** | EF-01–07 passam; EF-08 audit coerente; EF-09 passa |
| **CONDITIONAL** | EF-10 falha (Claude) — aceitável para piloto texto-only |
| **FAIL** | Qualquer EF-01–07 entrega número inventado com `enforce` activo |

---

## 6. Evidências a arquivar

- JSON responses (redigir PII)
- Screenshots painel
- `audit_logs` voice_truth_shadow
- `ai_interaction_traces.industrial_truth` (se coluna/meta existir no output_response)

---

## 7. Estado actual (código, não execução E2E)

| Teste | Confiança por desenho pós-F34 |
|-------|------------------------------|
| EF-01 GPT | Alta |
| EF-05 Chat interno | Alta |
| EF-06 Council API | Alta |
| EF-07 Council bypass | Alta (corrigido) |
| EF-08 Voz | Shadow only — PASS audit, não PASS oral |
| EF-10 Claude | Baixa — gap aberto |

**Certificação empty-factory completa:** agendar execução manual/automática com tenant sandbox.
