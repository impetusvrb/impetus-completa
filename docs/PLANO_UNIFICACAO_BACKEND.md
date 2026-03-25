# Plano de unificação dos backends — Impetus Comunica IA

**Objetivo:** Migrar funcionalidades de `impetus_complete/backend/` para `backend/` (raiz), manter um único ponto de entrada em produção (PM2) e **preservar** design e funcionalidades atuais.

**Princípios:** mudanças incrementais, commits atômicos, feature flags onde fizer sentido, staging antes de produção.

---

## Fase 1 — Dependências e ambiente (concluída na análise)

### 1.1 `package.json`

| Resultado | Detalhe |
|-----------|---------|
| **Comparação** | `cmp backend/package.json impetus_complete/backend/package.json` → **idênticos** (byte a byte). |
| **Ação** | Nenhuma dependência a adicionar na raiz neste momento. |
| **Manutenção** | Ao portar ficheiros novos da árvore legada, voltar a correr `npm ls` e alinhar versões se surgirem `require()` de pacotes extra. |

### 1.2 `.env` / `.env.example`

| Resultado | Detalhe |
|-----------|---------|
| **Referência canónica** | `backend/.env.example` já documenta D-ID (`D_ID_API_KEY`, `D_ID_API_BASE`, `D_ID_SOURCE_URL` comentário alinhado ao frontend), OpenAI Realtime (`IMPETUS_REALTIME_*`, `OPENAI_REALTIME_*`), Google TTS (`GOOGLE_TTS_*`, `GOOGLE_APPLICATION_CREDENTIALS`), pool PostgreSQL, Asaas, SMTP, feature flags (`AI_ORCHESTRATOR_ENABLED`, `REMINDER_SCHEDULER_ENABLED`, `OPERATIONAL_BRAIN_ENABLED`, etc.). |
| **`impetus_complete/backend/.env.example`** | Mantido como atalho + instruções de fusão com a raiz (evitar duplicar 200+ linhas). |
| **Ação na raiz** | Garantir chave explícita `OPENAI_REALTIME_BETA` (opcional) e secção curta sobre namespaces Socket.IO legados. |
| **Fusão do `.env` real (operacional)** | Manual: copiar valores de `impetus_complete/backend/.env` para `backend/.env` antes de trocar o PM2; **não** commitar segredos. |

### 1.3 Variáveis usadas no legado e cobertas pelo `.env.example` da raiz

- D-ID: `D_ID_API_KEY`, `D_ID_API_BASE`
- Realtime: `IMPETUS_REALTIME_PROXY_ENABLED`, `IMPETUS_REALTIME_WS_PATH`, `OPENAI_REALTIME_MODEL`, `OPENAI_REALTIME_BETA`
- Lipsync: `IMPETUS_REALTIME_LIPSYNC_ENABLED`, `IMPETUS_LIPSYNC_*`
- OpenAI TTS / voz: `OPENAI_*`, `IMPETUS_TTS_PROVIDER`, `TTS_ENGINE`
- Google TTS: `GOOGLE_TTS_*`, `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_TTS_KEYFILE`
- Socket.IO: sem variáveis obrigatórias (CORS/path no código); namespaces legados: `/impetus-voice`, `/impetus-avatar`, `/socket.io`

---

## Fase 2 — Portar rotas e serviços (parcial)

Ordem sugerida (menor risco primeiro):

1. **D-ID / TTS / voz (feito):** `useRoute('/api/did', '/api/tts', '/api/voz')`; serviços copiados do legado (`googleTtsCore`, `voiceTtsService` unificado OpenAI+Google, `openaiVozService`, `impetusVoiceChatService`, `impetusVoiceSession`, `ttsWelcomeTemplate`, `voiceNaturalnessMemory`); `chatVoice.js` e `userRateLimit.js` alinhados; `ERRORS.TOO_MANY_REQUESTS`.
2. `routes/tts.js`, `routes/voz.js` (se ainda necessários face a `chatVoice`).
3. `socket/voiceStreamSocket.js` + registo em `server.js` (espelhar `impetus_complete/server.js`).
4. `socket/realtimeOpenaiProxy.js` vs `services/realtimeOpenaiProxy.js` — **unificar** num único módulo (diff + testes WebSocket).
5. Serviços de suporte: `openaiVozService.js`, `googleTtsCore.js`, `impetusVoiceChatService.js`, etc., só se não existirem equivalentes na raiz.
6. **`/api/audit` (feito):** em `impetus_complete` não existia `routes/audit.js`; `safe()` montava um `Router` vazio. Na raiz: `backend/src/routes/audit.js` explícito + `useRoute('/api/audit', ...)`. UI de logs continua em `/api/admin/logs/audit`.
7. **`unifiedMessagingService.js` (feito):** copiado do legado — necessário para `reminderSchedulerService` e outros serviços que já o referenciavam na raiz.
8. `decisionEngine`, `onboarding`, `smartSummary`, `userIdentification`, `aiOrchestrator` — avaliar sobreposição com rotas já montadas na raiz antes de copiar.

---

## Fase 3 — Alinhar `server.js` da raiz com o legado

- Body parser: legado usa 1 MB geral + 50 MB em `/api/vision`; raiz usa 20 MB global — **não alterado nesta migração** (evitar regressões); alinhar num passo dedicado se necessário.
- `helmet`, `compression`, static `/uploads`: portar da `app.js` legada se faltar na raiz.
- Jobs (**feito nesta migração**): após `attachRealtimeOpenaiProxy` no **mesmo** `httpServer`, `unifiedMessaging.setSocketIo(io)`, `reminderScheduler.start()`, `machineMonitoring.start()` (stub, paridade com legado). `REMINDER_SCHEDULER_ENABLED=false` desliga lembretes. Shutdown: `SIGTERM`/`SIGINT` limpam cron do cérebro operacional, param reminder/monitoring e fecham o pool PG.

---

## Fase 4 — PM2 e desativação do legado

1. Backup + `pm2 save` atual.
2. Apontar `script path` para `backend/src/server.js` e `exec cwd` para `backend/`.
3. Smoke tests: health, login, chat, voz, D-ID (se ativo), ManuIA, webhooks Asaas.
4. Arquivar ou remover `impetus_complete/backend` apenas após período de observação.

---

## Fase 5 — Checklist de não-regressão

- [ ] Assinatura / webhook Asaas
- [ ] JWT e multi-tenant
- [ ] Dashboard e rotas industriais só na raiz
- [ ] Frontend `VITE_API_URL` inalterado
- [ ] Realtime + lipsync + D-ID (conforme flags)

---

*Documento vivo: atualizar após cada fase.*
