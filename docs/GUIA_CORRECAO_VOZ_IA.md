# Guia: Correção da Voz e Comportamento da IA no Impetus

**Objetivo:** Diagnosticar e corrigir alterações na voz da IA após atualizações.

**Importante:** As últimas alterações (Módulo 3D Vision) **não modificaram** nenhum código de voz. A mudança pode ter outra origem.

---

## 1. Arquitetura da Voz — Dois Pilares

| Pilar | O que controla | Onde ajustar |
|-------|----------------|--------------|
| **TTS (som da voz)** | Timbre, entonação, velocidade, modelo de áudio | Backend: `voiceTtsService.js` + variáveis `.env` |
| **Comportamento da IA** | O que a IA diz, tom, extensão da resposta | Backend: prompt do chat + parâmetro `voiceMode` |

---

## 2. TTS — Corrigir o Som da Voz

### 2.1 Arquivo principal

**`backend/src/services/voiceTtsService.js`**

Este serviço gera o áudio (MP3) a partir do texto. Controla:
- **Modelo**: `gpt-4o-mini-tts` (com instruções) ou fallback `tts-1-hd`
- **Voz**: `nova` (feminina), `alloy`, `echo`, `fable`, `onyx`, `shimmer`
- **Instruções de estilo**: tom, ritmo, sotaque PT-BR
- **Velocidade**: 0,75 a 1,25 (padrão 0,98)

### 2.2 Instruções de estilo (linhas 11–19)

```javascript
const TTS_INSTRUCTIONS =
  (process.env.OPENAI_TTS_INSTRUCTIONS || '').trim() ||
  [
    'Voz feminina brasileira, tom calmo, natural e amigável.',
    'Fala como uma assistente humana de verdade, em português do Brasil.',
    'Usa pausas leves entre ideias — nunca leitura corrida.',
    'Entonação suave e conversacional; nunca robótica nem de narração.',
    'Quando o texto tiver várias frases curtas, respeita esse ritmo, com micro-pausas entre elas.'
  ].join(' ');
```

**Como ajustar:** Editar o array acima ou definir `OPENAI_TTS_INSTRUCTIONS` no `.env` para sobrescrever.

### 2.3 Variáveis de ambiente (backend `.env`)

```env
# Obrigatório para TTS
OPENAI_API_KEY=sk-...

# Opcional — alteram o som da voz
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_DEFAULT_SPEED=0.98

# Sobrescreve as instruções padrão (tom, ritmo, sotaque)
# OPENAI_TTS_INSTRUCTIONS=Voz feminina brasileira, tom calmo...
```

**Ação:** Conferir se alguma dessas variáveis foi alterada no último deploy.

### 2.4 Preferências por usuário

**Tabela:** `voice_preferences`  
**Rotas:** `GET/PUT /api/dashboard/chat/voice/preferences`

Campos relevantes:
- `voice_id`: `nova`, `alloy`, `echo`, `fable`, `onyx`, `shimmer`
- `speed`: 0,75–1,25

**Arquivo:** `backend/src/routes/chatVoice.js` (linhas 186–257)

**Ação:** Verificar se as preferências do usuário foram resetadas ou alteradas (ex.: migração).

### 2.5 Frontend — origem da voz e velocidade

**`frontend/src/hooks/useVoiceEngine.js`**

- Linha 355: `voiceIdRef` usa preferências do usuário (ou `nova`)
- Linha 356: `speedRef` usa preferências (ou 0,98)

**`frontend/src/voice/ImpetusVoiceProvider.jsx`**

- Linhas 66–68: carrega `voice_id` e `speed` das preferências e passa ao motor de voz

**Ação:** Garantir que as preferências estão sendo carregadas e enviadas corretamente nas chamadas TTS.

---

## 3. Comportamento da IA — O que ela fala

### 3.1 Modo voz (`voiceMode: true`)

Quando o modo voz está ativo, o frontend envia `voiceMode: true` em:

**`frontend/src/services/api.js`** (linhas 249–253)

```javascript
chat: (message, history = [], opts = {}) =>
  api.post('/dashboard/chat', {
    message,
    history,
    ...(opts.voiceMode ? { voiceMode: true } : {})
  }),
```

O backend deve usar esse flag para ajustar o prompt (ex.: frases mais curtas, mais conversacional).

### 3.2 Onde o backend trata `voiceMode`

O endpoint `POST /dashboard/chat` costuma estar em um dos seguintes locais:

- Rota montada em `/api` que encaminha para o serviço de chat
- Serviço de chat/orquestrador que monta o system prompt

**Ação:** Localizar o handler de `POST /dashboard/chat` e conferir se `voiceMode` altera o system prompt ou instruções da IA.

Exemplo de bloco esperado no system prompt para modo voz:

```
Quando voiceMode=true: responda em frases curtas, progressivas, PT-BR, 
sem blocos longos. Ideal para leitura em voz alta.
```

---

## 4. Possíveis causas da mudança

| Causa | Onde verificar | Solução |
|-------|----------------|---------|
| Variáveis `.env` alteradas no deploy | `.env` no servidor | Reverter ou ajustar `OPENAI_TTS_*` |
| Atualização do modelo pela OpenAI | Documentação OpenAI | Testar `tts-1-hd` como fallback ou ajustar instruções |
| Preferências de voz resetadas | Tabela `voice_preferences` | Reconfigurar voz/velocidade nas preferências |
| Fallback para `tts-1-hd` | Logs backend `[voiceTts]` | Verificar se `gpt-4o-mini-tts` está falhando e caindo no fallback |
| Cache de TTS com hash antigo | Cache em `chatVoice.js` | Limpar cache ou reiniciar o backend |

---

## 5. Checklist de correção

### Voz (TTS)

- [ ] Conferir `OPENAI_API_KEY` e `OPENAI_TTS_MODEL` no `.env`
- [ ] Ajustar `OPENAI_TTS_INSTRUCTIONS` se quiser outro tom/ritmo
- [ ] Definir `OPENAI_TTS_DEFAULT_SPEED` (ex.: 0.95–1.0) se a voz estiver muito lenta ou rápida
- [ ] Verificar preferências do usuário: `GET /api/dashboard/chat/voice/preferences`
- [ ] Testar vozes diferentes: `nova`, `shimmer`, `onyx` (alterando `voice_id` nas preferências)

### Comportamento da IA

- [ ] Localizar o handler de `POST /dashboard/chat`
- [ ] Garantir que `voiceMode: true` altera o system prompt (frases curtas, tom conversacional)
- [ ] Revisar prompts e instruções para modo voz

### Deploy

- [ ] Após alterar `.env`: `pm2 restart impetus-backend --update-env`
- [ ] Após alterar código: `pm2 restart impetus-backend`

---

## 6. Arquivos relevantes

| Arquivo | Função |
|---------|--------|
| `backend/src/services/voiceTtsService.js` | TTS: modelo, instruções, voz, velocidade |
| `backend/src/routes/chatVoice.js` | Rotas de voz e preferências |
| `frontend/src/hooks/useVoiceEngine.js` | Motor de voz no frontend |
| `frontend/src/voice/ImpetusVoiceProvider.jsx` | Carrega preferências e integra o motor |
| `frontend/src/features/aiChat/AIChatPage.jsx` | Envia `voiceMode` ao chat |

---

## 7. Teste rápido

1. **TTS direto:** `POST /api/dashboard/chat/voice/speak` com `{ "text": "Olá, estou testando a voz.", "voice": "nova", "speed": 0.98 }`
2. **Preferências:** `GET /api/dashboard/chat/voice/preferences` (com token)
3. **Modo voz no chat:** Abrir a página do chat, ativar o microfone e verificar se as respostas ficam em frases curtas e naturais para voz.
