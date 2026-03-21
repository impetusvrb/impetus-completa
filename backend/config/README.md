# Google Cloud Text-to-Speech (Impetus)

## 1. JSON da conta de serviço

Coloque o ficheiro descarregado em:

**`backend/config/google-tts.json`**

Com isso, **`getTtsAvailable()`** passa a ser `true` (ficheiro encontrado em `BACKEND_ROOT/config/google-tts.json`, independente do `cwd`).

### Alternativa: `.env`

Podes definir, por exemplo:

```env
# Raiz do repositório (cwd ao correr a partir da raiz)
GOOGLE_APPLICATION_CREDENTIALS=./backend/config/google-tts.json
```

Ou, com o processo iniciado em **`backend/`**:

```env
GOOGLE_APPLICATION_CREDENTIALS=config/google-tts.json
```

Ou caminho absoluto. O serviço tenta resolver o ficheiro em vários sítios (`cwd`, pasta `backend`, e normalização de `./backend/...`).

Outra opção explícita:

```env
GOOGLE_TTS_KEYFILE=config/google-tts.json
```

(relativo à pasta **`backend`**)

No [Google Cloud Console](https://console.cloud.google.com/), ativa a API **Cloud Text-to-Speech** e usa uma conta de serviço com permissão para essa API.

## 2. Voz

Padrão sugerido (voz natural HD): **`pt-BR-Chirp3-HD-Aoede`** (feminina). Outras Chirp3 HD femininas: `pt-BR-Chirp3-HD-Kore`, `pt-BR-Chirp3-HD-Zephyr`, etc. (lista na Google Cloud).

```env
GOOGLE_TTS_VOICE=pt-BR-Chirp3-HD-Aoede
```

**Prosódia (opcional, `.env`):**

- `GOOGLE_TTS_PITCH` — semitons na API para vozes que **não** são Chirp (padrão sugerido `-0.5` para tom adulto sem ficar grave). **Chirp3** não aceita `pitch` no `audioConfig`.
- `GOOGLE_TTS_DEFAULT_SPEAKING_RATE` — ritmo base (ex.: `0.95`).
- `GOOGLE_TTS_VOLUME_GAIN_DB` — presença (ex.: `1.5`).
- `GOOGLE_TTS_USE_SSML=false` — desliga SSML e usa só texto bruto.

**SSML no Chirp3 (padrão):** `GOOGLE_TTS_SSML_OUTER_MODE=pct` envolve o texto em `<prosody pitch="-1%" rate="98%">` (altura suave, firme). No fim de cada trecho (após `?` / `!` / `…` ou quebra de linha), a última parte da frase recebe queda de tom com `GOOGLE_TTS_SSML_FALL_PITCH_PCT` e `GOOGLE_TTS_SSML_FALL_RATE_PCT` (ex.: `-2` e `93`).

- `GOOGLE_TTS_SSML_OUTER_MODE=st` — legado: wrapper externo só com semitons (`GOOGLE_TTS_SSML_PITCH_ST` ou `GOOGLE_TTS_PITCH`).
- `GOOGLE_TTS_SSML_BASE_PITCH_PCT` / `GOOGLE_TTS_SSML_BASE_RATE_PCT` — ajustam o envelope global em % (modo `pct`).
- `GOOGLE_TTS_SSML_EMPHASIS` — `moderate` | `strong` | `reduced` para a palavra **Impetus** (padrão `moderate`).
- `GOOGLE_TTS_BREAK_MS` / `GOOGLE_TTS_SENTENCE_BREAK_MS` — pausas após pontuação forte e entre trechos.
- `GOOGLE_TTS_SSML_SENTENCE_FALL=false` — desliga a queda de tom no remate das frases.
- `GOOGLE_TTS_SSML_BREATH_MAX` — pausas curtas após vírgulas em trechos longos (Chirp; padrão `2`; `0` desliga).
- `GOOGLE_TTS_SSML_BREATH=false` — desliga totalmente as pausas “respiração”.

Com SSML ativo, o backend não parte frases por `. ` (evita “Dr.” quebrado); usa `?` `!` `…` e novas linhas como fronteiras.

### Voz — variação de abertura e memória (servidor)

O serviço `voiceNaturalnessMemory` guarda por utilizador (em memória do processo) o último assunto e o início das últimas respostas da IA, injetando instruções no **modo voz** do `POST /dashboard/chat` para evitar “Olá, em que posso ajudar?” repetido e retomar contexto.

### Personalização por nome (TTS)

- **`POST .../dashboard/chat/voice/speak`** pode enviar `userDisplayName` (opcional). Se omitido, o backend usa `req.user.name` da sessão. Em ambos os casos o TTS usa **só o primeiro nome** (primeira palavra).
- No texto enviado ao TTS, substituem-se automaticamente os placeholders **`${usuario}`**, **`{{nome}}`**, **`{{tts_nome}}`**, **`__TTS_NOME__`** pelo **primeiro nome** (fala natural; não se usa `say-as` por caractere).
- Desligar substituição: `GOOGLE_TTS_TEMPLATE_NAME=false`.

### Chat Impetus — continuidade após pausa

O endpoint de chat analisa frases do tipo “volto já”, “um minuto”, “voltei”, “onde paramos” e injeta instruções curtas ao modelo para manter o fio, usando o histórico enviado pelo front. No **modo voz**, o histórico recente considerado passa a **12** mensagens (texto continua com 6).

### Template SSML de boas-vindas

- **`POST .../dashboard/chat/voice/welcome`** — corpo JSON opcional:
  - `variant`: `full` (vários blocos `<prosody>` + `<break>`, como o template Chirp3) ou `short` (uma saudação curta).
  - `userDisplayName`: se omitido, usa `req.user.name` (sempre reduzido ao **primeiro nome** no servidor).
  - `spellName`: `true` envolve o nome em `<say-as interpret-as="characters">` (**soletra**; só use se for o efeito desejado).
  - `speed`, `voice`: iguais ao `/speak` quando aplicável.
- Resposta: `audio/mpeg` (mesmos headers `X-TTS-*` que o `/speak`).
- Env global: `GOOGLE_TTS_WELCOME_SPELL_NAME=true` ativa soletração por defeito (pode ser anulado com `spellName: false` no body).

Texto SSML enviado ao TTS **não** passa por `preprocessForNaturalSpeech` (evita estragar tags). Texto plano continua a ser humanizado como antes.

## 3. Arranque

```bash
cd backend
npm run dev
```

O endpoint **`POST /api/dashboard/chat/voice/speak`** usa Google TTS; o front e os triggers existentes mantêm-se.

## 4. Cache / fingerprint

O cache usa `ttsEngineFingerprint()` → `google:pt-BR:<VOICE_NAME>` (ex.: `google:pt-BR:pt-BR-Chirp3-HD-Aoede`).
