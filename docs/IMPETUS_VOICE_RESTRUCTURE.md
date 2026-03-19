# Reestruturação voz Impetus — resumo

## O que existia (antes)

| Área | Onde | Como |
|------|------|------|
| **Chat** | `AIChatPage.jsx` | Modo voz no header, painel orb “ChatGPT”, toolbar com mic (ditado), loop Web Speech → `dashboard.chat` → `gerarVoz` + fallback **SpeechSynthesis** |
| **TTS** | `api.gerarVoz` → `/voz` + `useVoiceOutput.js` | OpenAI TTS + **speechSynthesis** (fallback) |
| **STT** | Web Speech API em `useVoiceInput` + captura no loop | Sem Whisper no fluxo do chat |
| **Alertas** | `alertaIA.js` | `gerarVoz` + `<audio>` base64 |
| **Botão verde** | Removido | Era `ai-chat-voice-ask-*` / painel verde “Falar pergunta…” |

## O que foi feito

- **Input único**: placeholder `Digite ou fale...`, mic 16px à direita **dentro** do campo, estados cor + animação.
- **Badge** acima do input (Ouvindo / Processando / Falando).
- **`useVoiceEngine.js`**: STT Whisper (silêncio ~1,8s) + fallback Web Speech; TTS **OpenAI** via `/dashboard/chat/voice/speak` + **AudioContext** (sem `speechSynthesis`).
- **`wakeWordDetector.js`**: “Ok Impetus” etc.; após sair do modo contínuo, retoma escuta em background (se mic já autorizado).
- **`voiceAlertManager.js`**: prioridades P1–P4, dedupe 5 min, integração com `operationalBrain.getAlerts`.
- **Backend** `routes/chatVoice.js`: `transcribe`, `speak`, `format-alert`, `preferences` + migration `voice_preferences`.

## WebSocket `/impetus-voice` (streaming TTS)

- Namespace Socket.IO: **`/impetus-voice`** (mesmo host/porta do API, `path: /socket.io`).
- Eventos: cliente emite `voice:speak_stream` `{ text, voice, speed }` → servidor responde com `voice:mp3` `{ i, n, b64 }` e `voice:stream_end`. Interromper: `voice:cancel`.
- TTS no servidor: **`gpt-4o-mini-tts`** + instruções de conversa PT-BR (env `OPENAI_TTS_INSTRUCTIONS`). Fallback `tts-1-hd`.
- Front: `useVoiceEngine` conecta automaticamente; desligar com `VITE_VOICE_WEBSOCKET=false` (só HTTP + prefetch).

## Montagem obrigatória no servidor

1. No `server.js` (Express):

```js
const chatVoice = require('./src/routes/chatVoice');
app.use('/api/dashboard/chat/voice', chatVoice);
```

2. `npm run migrate` (cria `voice_preferences`).

3. `OPENAI_API_KEY` no `.env` (Whisper + TTS).

4. Front: opcional `VITE_USE_WHISPER_STT=false` força só Web Speech para STT.
