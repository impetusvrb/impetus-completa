# ANAM_TRUTH_VALIDATION_REPORT — FASE 34

**Data:** 2026-06-01  
**Objectivo:** validação shadow de verdade para voz (sem bloqueio, sem alteração de UX).

---

## 1. Implementação

### Backend

| Componente | Função |
|------------|--------|
| `industrialTruthEnforcementService.shadowAssessTextResponse` | Avalia com `assessmentOnly: true` — não altera texto |
| `cognitiveTruthClosureService.assessVoiceTranscriptShadow` | Orquestra assess + audit |
| `POST /api/dashboard/voice-truth-shadow-validate` | Entrada autenticada |

**Body:** `{ assistant_text, query_text?, channel? }`  
**Resposta:** `{ ok, assessment: { would_replace, would_block, would_replace_text, confidence, action, evidence_binding, ... }, shadow_only: true }`

**Audit trail:** `INSERT audit_logs` com `action = 'voice_truth_shadow'` (JSON sem PII completo — excertos de tamanho).

### Frontend (fire-and-forget)

| Origem | Canal | Ficheiro |
|--------|-------|----------|
| Anam persona (stream + history) | `anam_voice` | `anamPanelBridge.js` → `scheduleVoiceTruthShadow` |
| OpenAI Realtime `response.done` | `openai_realtime` | `useVoiceEngine.js` |

**UX:** nenhuma alteração de áudio, `talk()` ou texto mostrado ao utilizador.

---

## 2. Campos registados (assessment)

| Campo | Significado |
|-------|-------------|
| `would_replace` | `true` se enforcement substituiria o texto (modo enforce) |
| `would_block` | `true` se acção `replace_no_data` ou `unsupported_claim` |
| `would_replace_text` | Texto que seria entregue (`MSG_NO_DATA` / `MSG_UNSUPPORTED`) |
| `confidence` | 0.28–0.88 heurística derivada de `action` + `evidence_binding` |
| `action` | `pass` \| `replace_no_data` \| `unsupported_claim` |
| `evidence_binding` | `source_table`, `company_id`, `confidence`, `channel` |

---

## 3. Fluxo Anam (inalterado na entrega)

```text
buildAnamSystemPrompt → session-token → WebRTC
  ↓ (paralelo)
injectOperationalVoiceContext → GET voice-realtime-context
  ↓
Persona fala (sem enforce server-side na stream)
  ↓
scheduleVoiceTruthShadow → POST voice-truth-shadow-validate
  ↓
audit_logs (voice_truth_shadow)
```

**Contexto de entrada:** continua `voiceRealtimeContextService` + `buildPromptTruthAppendix`.

---

## 4. Limitações declaradas

1. Shadow corre **após** a fala — não previne alucinação em tempo real.
2. Depende do cliente enviar transcript completo (≥ 8 caracteres).
3. Não liga automaticamente a `hallucinationReviewQueue` (pode ser fase seguinte).
4. `IMPETUS_INDUSTRIAL_TRUTH_MODE=shadow` global não é necessário — `assessmentOnly` força avaliação sem mutação.

---

## 5. Operação

```bash
# Exemplo (com JWT de sessão)
curl -X POST "$API/dashboard/voice-truth-shadow-validate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"assistant_text":"OEE está em 92%","query_text":"Qual o OEE?","channel":"anam_voice"}'
```

Consultar auditoria:

```sql
SELECT created_at, description
FROM audit_logs
WHERE action = 'voice_truth_shadow'
ORDER BY created_at DESC
LIMIT 20;
```

---

## 6. Classificação pós-F34

| Aspeto | Estado |
|--------|--------|
| Protecção prompt | Mantida |
| Enforcement na fala | **Não** (por desenho F34) |
| Shadow + audit | **Implementado** |
| Pronto para enforce voz | Requer fase futura (STT → enforce → TTS opcional) |
