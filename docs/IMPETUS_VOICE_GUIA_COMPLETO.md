# Impetus — Guia completo da voz (tudo gravado)

Documento único com **o que existe**, **o que foi feito**, **ficheiros**, **env** e **próximos passos**. Atualizado para consulta à noite ou por outra pessoa.

---

## 1. Objetivo do sistema

- Chat **por voz**: ouvir → transcrever → IA responde → **TTS** (fala).
- **Modo contínuo** (mic ligado) e **wake word** (“Ok Impetus” / “Ok, Impetus”).
- **Interrupção**: utilizador fala enquanto a IA fala → corta áudio.
- **Sem** `speechSynthesis` no fluxo principal do chat (só OpenAI TTS via API).

---

## 2. O que foi feito (melhorias)

| Tema | O quê |
|------|--------|
| **TTS** | `gpt-4o-mini-tts` + instruções PT-BR (tom feminino, conversacional, pausas). Fallback `tts-1-hd`. Voz padrão **`nova`**. |
| **Velocidade** | Padrão **0,98** (`OPENAI_TTS_DEFAULT_SPEED`). Ajustável nas preferências de voz. |
| **Ritmo** | Texto **partido em frases curtas** no backend e no front → vários MP3 com **pausa** entre eles. |
| **Streaming** | WebSocket **`/impetus-voice`**: gera áudio **frase a frase** (começa a falar antes do texto inteiro). |
| **STT** | **Whisper** (upload webm) se `VITE_USE_WHISPER_STT=true`; senão **Web Speech**; escuta contínua com **`captureWebSpeechUntilPause`** (silêncio ~1,5s fecha a tomada). |
| **Wake** | `wakeWordDetector.js` — normaliza vírgula (“ok, impetus”). Ao disparar: **para TTS** → resposta em 3 trechos (“Oi.” / “Pode falar.” / “Estou te ouvindo.”). |
| **Barge-in** | Microfone analisa volume durante TTS; se deteta fala, **para** e cancela stream WS. |
| **LLM modo voz** | `voiceMode: true` no chat → prompt pede **frases curtas**, progressivas, PT-BR, sem blocos enormes. |
| **ElevenLabs** | **Removido** do health/TTS legado; stack atual é **OpenAI** para TTS. Próximo degrau: plugar **outro TTS** (ex.: ElevenLabs) só na rota de fala. |
| **Preferências** | Tabela `voice_preferences`: `voice_id`, `speed`, alertas, etc. |

---

## 3. Ficheiros principais

### Frontend (repo raiz `frontend/`)

| Ficheiro | Função |
|----------|--------|
| `src/hooks/useVoiceEngine.js` | Loop contínuo, STT, TTS HTTP/WS, barge-in, wake callback. |
| `src/services/wakeWordDetector.js` | Deteção “Ok Impetus” via Web Speech contínuo. |
| `src/services/voiceAlertManager.js` | Alertas por voz (prioridades). |
| `src/features/aiChat/AIChatPage.jsx` | Integra `useVoiceEngine`, `chatRound` com `voiceMode`. |
| `src/services/api.js` | `getVoicePreferences`, `putVoicePreferences`, `chat` com `voiceMode`. |
| `src/utils/alertaIA.js` | Alertas → `fetch` speak. |

### Backend deploy típico (`impetus_complete/backend/`)

| Ficheiro | Função |
|----------|--------|
| `src/routes/chatVoice.js` | `POST /transcribe`, `POST /speak`, `format-alert`, `preferences`. |
| `src/services/voiceTtsService.js` | `synthesizeMp3`, `splitForNaturalTts`, instruções TTS. |
| `src/socket/voiceStreamSocket.js` | Namespace `/impetus-voice`. |
| `src/server.js` | `initVoiceStreamSocket(io)`. |
| `src/app.js` | `app.use('/api/dashboard/chat/voice', ...)`. |
| `src/routes/dashboard.js` | Chat com `voiceMode` + bloco **VOICE_IMPETUS_IDENTITY**. |

### Espelho no monorepo (`backend/src/`)

- Mesma ideia: `routes/chatVoice.js`, `services/voiceTtsService.js` (se o teu deploy usar esta pasta).

### Documentação

| Doc | Conteúdo |
|-----|----------|
| `docs/IMPETUS_VOICE_RESTRUCTURE.md` | Antes/depois + montagem servidor. |
| `docs/VOICE_STRATEGY.md` | OpenAI agora vs TTS profissional depois. |
| **`docs/IMPETUS_VOICE_GUIA_COMPLETO.md`** | Este ficheiro (índice geral). |

---

## 4. Variáveis de ambiente

### Backend (`.env`)

```env
OPENAI_API_KEY=            # obrigatório para TTS + Whisper
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_DEFAULT_SPEED=0.98
# OPENAI_TTS_INSTRUCTIONS=   # opcional — sobrescreve instruções de estilo da voz
```

### Frontend (build / `.env`)

```env
VITE_API_URL=              # ex.: https://api.teudominio.com/api
VITE_USE_WHISPER_STT=true  # ou false — prioriza Web Speech
VITE_VOICE_WEBSOCKET=false # só se quiseres desligar WS e usar só HTTP TTS
```

---

## 5. API útil

- `POST /api/dashboard/chat/voice/speak` — body JSON: `{ text, voice, speed }` → MP3.
- `POST /api/dashboard/chat/voice/transcribe` — multipart `audio` (webm).
- `GET/PUT /api/dashboard/chat/voice/preferences`.
- Socket.IO: URL base do API, path `/socket.io`, namespace **`/impetus-voice`**.

---

## 6. Deploy e restart

```bash
# Migrações (se ainda não)
cd impetus_complete/backend && npm run migrate

# PM2 (exemplo)
pm2 restart impetus-backend impetus-frontend
# Se mudaste .env no backend:
pm2 restart impetus-backend --update-env
```

Frontend: `npm run build` no `frontend/` (ou pasta que o PM2 servir).

---

## 7. Limitações honestas

- A **API pública** da OpenAI **não** replica o modo voz interno do ChatGPT.
- **Timbre “perfeito”** ou clone → outro fornecedor (**ElevenLabs**, Azure, Google) só na camada TTS.
- O que o sistema maximiza hoje: **ritmo**, **frases curtas**, **interrupção**, **streaming**, **prompt** da IA em modo voz.

---

## 8. Próximo passo (quando quiseres)

- Integrar **`TTS_PROVIDER=elevenlabs`** (ou similar) **apenas** em `speak` + `voiceStreamSocket`, mantendo GPT no chat.
- Pedir à IA: *“monta ElevenLabs no TTS do Impetus”* e indicar `ELEVEN_API_KEY` + `ELEVEN_VOICE_ID`.

---

*Gravado para continuares à noite ou partilhares com a equipa.*
