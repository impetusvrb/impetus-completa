# VOICE TRUTH CLOSURE AUDIT — FASE 47.5-A

**Data:** 2026-06-03  
**Canal:** `POST /api/voz/conversa`  
**Serviço:** `backend/src/services/impetusVoiceChatService.js`  
**Função auditada:** `processVoiceTurn()`

---

## 1. Mapa do fluxo

```text
POST /api/voz/conversa (routes/voz.js)
  ↓ requireAuth + promptFirewall + userRateLimit
  ↓ impetusVoiceChatService.processVoiceTurn(user, message, { reset })
      ├─ [early exit] reset sem mensagem → { cleared: true }
      ├─ [early exit] mensagem vazia → resposta fixa (não-LLM)
      ├─ [early exit] padrões sensíveis → resposta fixa (não-LLM)
      ├─ buildSystemPrompt(user, message)
      │     ├─ chatUserContext.buildChatUserContext
      │     ├─ documentContext.getImpetusLGPDComplianceProtocol
      │     └─ IMPETUS_IA_SYSTEM_PROMPT_FULL + regras modo VOZ
      ├─ voiceSession.getMessages(user.id)  → histórico curto
      ├─ runAI({ input, user, context, mode: 'voice', history })
      ├─ fallback CHAT_FALLBACK se resposta vazia/FALLBACK:
      ├─ [FASE 47.5-C] applyCognitiveTextTruth(reply, { channel: 'voice_assistant' })
      ├─ voiceSession.append(user + assistant)
      ├─ openaiTts.gerarAudio(reply)
      └─ return { reply, audio }
```

---

## 2. Verificação por etapa

| Etapa | Componente | Truth antes da entrega? |
|-------|------------|-------------------------|
| Entrada | `promptFirewall` na rota | Pré-filtro (não truth operacional) |
| Contexto | `buildSystemPrompt` + `chatUserContext` | Prompt only |
| LLM | `runAI` (orchestrator, mode `voice`) | Sem truth interno |
| Pós-processamento | trim + slice(3500) | Sem truth (pré-47.5) |
| **Closure F47.5** | `applyCognitiveTextTruth` → `enforceTextResponse` | **Sim** |
| Resposta final | JSON `{ reply, audio }` + TTS | Texto já enforced |

---

## 3. Caminhos de saída

| Caminho | Origem | LLM? | Truth necessário? | Estado pós-47.5 |
|---------|--------|------|-------------------|-----------------|
| `cleared: true` | reset sem texto | Não | Não | **SAFE** |
| «Não ouvi nada…» | template fixo | Não | Não | **SAFE** |
| «Esse tipo de assunto…» | template fixo (sensível) | Não | Não | **SAFE** |
| Resposta `runAI` | LLM | Sim | **Sim** | **SAFE** (closure F47.5-C) |
| Erro 500 rota | template fixo | Não | Não | **SAFE** |

---

## 4. Estado pré-correção (FASE 47)

| Aspeto | Veredicto |
|--------|-----------|
| `IndustrialTruthEnforcementService` | **Ausente** |
| `applyCognitiveTextTruth` | **Ausente** |
| Hallucination block síncrono | **Ausente** |
| Classificação | **UNSAFE** |

O texto gerado por `runAI` era entregue directamente ao utilizador e ao TTS sem passar por truth enforcement.

---

## 5. Correção FASE 47.5-C

**Ficheiro:** `impetusVoiceChatService.js`  
**Alteração:** invocação de `cognitiveTruthClosureService.applyCognitiveTextTruth` após `runAI` e antes de `voiceSession.append` / TTS.

```javascript
const finalized = await truthClosure.applyCognitiveTextTruth(reply, {
  user,
  channel: 'voice_assistant',
  queryText: trimmed,
  injectOperational: true
});
reply = finalized.text;
```

**Preservado:** UX, prompts, modelos, histórico de sessão, TTS, limites de tokens.

---

## 6. Classificação final

| Dimensão | Pré-47.5 | Pós-47.5 |
|----------|----------|----------|
| Truth Enforcement | ❌ | ✅ `enforceTextResponse` via closure |
| Hallucination Block | ❌ | ✅ via pipeline enforce (flag `IMPETUS_HALLUCINATION_BLOCK`) |
| Evidence Binding | ❌ | ✅ meta em `applyCognitiveTextTruth` |
| Respostas template | ✅ | ✅ |
| Respostas LLM | ❌ **UNSAFE** | ✅ **SAFE** |

### Veredicto: **SAFE**

---

*FASE 47.5-A — auditoria + closure mínimo aplicado.*
