# Plano de ação: unificar `impetus_complete/backend` → `backend/` (raiz)

**Objetivo:** Um único backend em `/backend`, preservando design e funcionalidades atuais do Impetus Comunica IA.  
**Estado atual (PM2):** processo `impetus-backend` executa `impetus_complete/backend/src/server.js`.  
**Meta:** apontar PM2 para `backend/src/server.js` após paridade funcional.

---

## Fase 1 — Dependências e ambiente (concluída na análise)

### 1.1 `package.json`

| Verificação | Resultado |
|-------------|-----------|
| Diff `impetus_complete/backend/package.json` vs `backend/package.json` | **Idênticos** (scripts e `dependencies` alinhados, inclusive `openai`, `ws`, `socket.io`, `@google-cloud/text-to-speech`, etc.) |
| Ação | Nenhuma alteração obrigatória na raiz. Manter `npm install` na pasta `backend/` como fonte única após migração de código. |

### 1.2 `package-lock.json`

- Mesmo tamanho em bytes; **hashes diferentes** — árvores de resolução podem divergir minimamente.
- **Recomendação:** após copiar/ajustar código, executar `npm install` em `backend/` e commitar o lock resultante como referência única.

### 1.3 Variáveis de ambiente

| Fonte | Papel |
|-------|--------|
| `backend/.env.example` | **Documento mestre** — já inclui D-ID (`D_ID_API_KEY`, `D_ID_API_BASE`, `D_ID_SOURCE_URL`), OpenAI Realtime, Google TTS (todas as chaves SSML), pool PostgreSQL, Asaas, feature flags, ManuIA, workers, testes (`test:voz`, `test:realtime`, `test:did`). |
| `impetus_complete/backend/.env.example` | **Mínimo** — remete à raiz; adequado só para lembrar `PORT`, DB e JWT. |

**Ação aplicada na raiz:** `OPENAI_REALTIME_BETA=` documentada como chave explícita (usada em `socket/realtimeOpenaiProxy.js` do legado e equivalente em `services/realtimeOpenaiProxy.js`).

**Ação operacional (não commitar segredos):** ao mudar o PM2 para a raiz, **copiar/ fundir** o `.env` atual de `impetus_complete/backend/.env` para `backend/.env`, garantindo que nenhuma chave usada só no legado se perca (D-ID, Google credentials path, `IMPETUS_REALTIME_*`, etc.).

### 1.4 Checklist pós-fusão `.env`

- [ ] `OPENAI_API_KEY`
- [ ] `D_ID_API_KEY` + `D_ID_SOURCE_URL` (HTTPS público para a D-ID)
- [ ] `IMPETUS_REALTIME_PROXY_ENABLED` e `OPENAI_REALTIME_MODEL`
- [ ] `GOOGLE_TTS_KEYFILE` ou `GOOGLE_APPLICATION_CREDENTIALS`
- [ ] `JWT_SECRET`, `DB_*`, `ASAAS_*` (se usados)
- [ ] `OPERATIONAL_BRAIN_ENABLED`, `REMINDER_SCHEDULER_ENABLED` (se quiser paridade com o `server.js` do legado)

---

## Fase 2 — Paridade de rotas e serviços (próxima)

1. Comparar `app.js` (legado) com `useRoute` em `backend/src/server.js`.
2. Copiar/registrar na raiz o que falta: **`/api/did`**, **`/api/tts`**, **`/api/voz`**, **`/api/audit`**, **`/api/decision-engine`**, **`/api/onboarding`**, rota **`admin` monolítica** se ainda necessária, **`smartSummary`**, **`userIdentification`**, **`setupCompany`**, **`aiOrchestrator`** — conforme matriz já levantada.
3. Unificar caminhos duplicados (`socket/realtimeOpenaiProxy` vs `services/realtimeOpenaiProxy`) com uma única implementação e imports atualizados.

---

## Fase 3 — Arranque do processo (Socket.IO, jobs)

1. Avaliar portar para `backend/src/server.js`: `initVoiceStreamSocket`, `reminderScheduler`, `operationalBrainEngine`, `machineMonitoringService` (hoje stub), `unifiedMessagingService.setSocketIo`.
2. Garantir mesma ordem de inicialização (HTTP → Socket.IO → proxy Realtime → lipsync).

---

## Fase 4 — Testes e cutover

1. Smoke: auth, dashboard, chat, voz, D-ID, ManuIA, webhooks Asaas.
2. Staging: PM2 apontando para `backend/` com mesmo `PORT` e `.env` fundido.
3. Produção: janela de manutenção, rollback = restaurar script PM2 para `impetus_complete`.

---

## Fase 5 — Limpeza

1. Arquivar ou remover `impetus_complete/backend` após período de observação (ex.: 2 semanas).
2. Atualizar comentário em `backend/src/server.js` para refletir PM2 na raiz.

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Rotas ausentes na raiz (404) | Checklist de rotas do `app.js` vs `server.js` antes do cutover |
| `.env` incompleto | Diff entre os dois `.env` (local, nunca em git) |
| Duas versões de `dashboard.js` divergentes | Merge manual ou diff dirigido por funcionalidade |

---

*Documento vivo — Fase 1 validada por comparação de ficheiros em repositório.*
