# Auditoria de runtime de produção — IMPETUS

**Data da auditoria (UTC):** 2026-05-12T17:40Z  
**Modo:** consolidação operacional segura (sem alteração de prompts, council, scoring ou policy runtime).

## 1. Resumo executivo

| Área | Estado |
|------|--------|
| API backend (PM2 `impetus-backend`) | Online após restart ordenado |
| Frontend (PM2 `impetus-frontend`) | Online |
| PostgreSQL (127.0.0.1:5432) | Em escuta |
| HTTP `/health` e `/api/health` | 200 |
| Deep health `/api/system/health/deep` | `{"ready":true,"issues":[]}` |
| Migrations pendentes seguras | 1 aplicada nesta operação (`cognitive_event_backbone_migration.sql`) |
| Migrations destrutivas | 1 bloqueada pelo runner (sem flag) — ver `cognitive-migration-state.md` |

## 2. Processos PM2 (host actual)

| Nome | Script / comando | PID (pós-restart) | Restarts (histórico) | Notas |
|------|-------------------|-------------------|----------------------|--------|
| `impetus-backend` | `backend/src/server.js` | 2911621 | 115 | Reinícios históricos elevados — monitorizar causa raiz fora deste ciclo |
| `impetus-frontend` | `npm run preview:prod` | 2911648 | 61 | Servir SPA de produção |
| `lipsync-api` | Python API | 766 | 0 | Serviço auxiliar realtime/lipsync |

**Nota:** Não existe ficheiro `ecosystem*.config.js` na raiz do repositório analisado; a verdade operacional é a tabela PM2 activa no servidor.

## 3. Portas e serviços de rede relevantes

- **4000** — Node (processo PM2 `impetus-backend`, HTTP + Socket.io no mesmo `httpServer`).
- **3000** — Frontend preview/prod (resposta HTTP 200 na raiz).
- **80** — nginx (reverse proxy típico).
- **5432** — PostgreSQL local.
- **9999** — processo Node adicional no host (validar se é tooling ou outro stack; fora do PID PM2 Impetus).
- **5001** — `lipsync-api` (alinhado a `IMPETUS_LIPSYNC_URL` no `.env.example`).

## 4. Realtime / WebSocket

- **Socket.io** montado no mesmo servidor Express (`path: /socket.io`), conforme `server.js`.
- Logs de boot recentes referem `[VOICE_WS]` namespace `/impetus-voice` e `[realtime-proxy]` em `/impetus-realtime`.

## 5. Schedulers e tarefas internas (processo Node único)

Registos de arranque indicam (sem PM2 separado para cada um):

- `REMINDER` — scheduler iniciado.
- `SYSTEM_METRICS` — persistência periódica.
- `OPERATIONAL_BRAIN` — alert checker (intervalo ~5 min).
- `DATA_LIFECYCLE` — retenção/expurgo agendado (24h).
- `EVENT_PIPELINE_BOOT` — neste host: `ok:false`, `reason:"disabled_by_env"` (esperado se pipeline desligado por ENV).

**Workers npm** (`proacao-worker`, `subscription-worker`, `*-intelligence-worker`, etc.) existem em `package.json` mas **não** aparecem como processos PM2 neste mapa — provável execução manual, systemd ou outro orquestrador.

## 6. Filas / backbone cognitivo

- Configuração de fila diferida e limites documentada em `.env.example` (`IMPETUS_EVENT_QUEUE_*`, `IMPETUS_EVENT_BACKBONE_*`).
- Estado efectivo depende do `.env` de produção (não reproduzido neste documento por segurança).

## 7. Serviços cognitivos (carregamento lógico vs activação ENV)

O código carrega módulos de governança e política; **a exposição em API admin e dashboards** depende de flags `IMPETUS_*` (kill-switches). Referência canónica: `backend/.env.example`.

| Domínio | Módulos / rotas | Observação |
|---------|-----------------|------------|
| Event backbone | `cognitiveEventBackboneService`, rotas métricas em `adminLearning` | Tabela `cognitive_event_backbone` criada/aplicada na BD nesta consolidação |
| Consensus / voting / calibration / CSI | Rotas sob `/api/admin/learning/*` | Resposta e dados dependem de ENV + auth |
| Drift / replay | Rotas drift e replay | Idem |
| Governance dashboard | `GET /api/admin/learning/dashboard` | Requer `IMPETUS_COGNITIVE_DASHBOARD_ENABLED` |
| Policy phases 1–12 | `policy-discovery` … `policy-evolution` | Cada fase com o seu `IMPETUS_POLICY_*` ou equivalente |
| Unified orchestrator | `unifiedOrchestrator`, métricas em dashboard | Comportamento não alterado nesta operação |

## 8. Código vs produção efectiva

- **Código no disco** (`/var/www/impetus-completa`) inclui fases de policy, diff e evolution.
- **Runtime** reflecte o código após `pm2 restart … --update-env` (reload de `NODE` com env do PM2).
- **Feature flags** desactivadas em `.env.example` implicam endpoints 403 com códigos tipo `POLICY_*_DISABLED` — correcto e seguro até decisão explícita de activação.

## 9. Rotas admin learning (existência no código)

Prefixo montado: `/api/admin/learning` (`server.js`).

Rotas verificadas no router `adminLearning.js`: `dashboard`, `policy-discovery`, `policy-contract`, `policy-signals`, `policy-facade`, `policy-arbitration`, `policy-obligations`, `policy-graph`, `policy-readiness`, `policy-simulation`, `policy-sandbox`, `policy-diff`, `policy-evolution`, além de context-integrity, legacy-runtime, event-queue-health, consensus, calibration, CSI, drift, replay, etc.

## 10. Riscos e follow-up recomendado

1. Investigar **causa dos 115 restarts** acumulados no `impetus-backend` (não crash loop imediato; `unstable_restarts: 0` no describe pré-restart).
2. **Migration legada pgvector** — congelada e fora do plano forward; denylist permanente no runner. Ver `vector-migration-hardening-report.md` (substitui nota antiga só com flag destrutiva).
3. Manter **observação operacional** (métricas PM2, logs, latência) — ver secção equivalente em `post-restart-runtime-state.md`.

---

*Documento gerado automaticamente no âmbito da consolidação segura de produção. Não contém segredos nem credenciais.*
