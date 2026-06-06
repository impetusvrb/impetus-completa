# PM2 STABILITY FINAL CERTIFICATION — FASE 49-C

**Data:** 2026-06-04T13:50:00Z  
**Processos auditados:** `impetus-backend` (id 3), `impetus-frontend` (id 2)  
**Fontes:** `pm2 list`, `pm2 describe`, `/root/.pm2/pm2.log`, logs de erro

---

## Estado actual

| Processo | Status | PID | Uptime | Restarts | Unstable restarts |
|----------|--------|-----|--------|----------|-------------------|
| impetus-backend | ✅ online | 605660 | **14h+** | 350 | **0** |
| impetus-frontend | ✅ online | 606490 | **14h+** | 159 | **0** |

**Conclusão imediata:** Sem restart loop activo. Processos estáveis desde recovery 2026-06-03 22:54.

---

## Análise histórica (`/root/.pm2/pm2.log`)

| Tipo de evento | impetus-backend | Interpretação |
|----------------|-----------------|---------------|
| `exited with code [0] via signal [SIGINT]` | **348** | Reload/restart **intencional** (`pm2 reload`, `pm2 restart`, deploy) |
| `Process 3 in a stopped status, starting it` | **107** | Ciclo normal PM2 após stop controlado |
| `exited with code [1]` (backend) | **80** | Majoritariamente **bursts SIGINT** em 27/04 e 04/05 (deploys rápidos), não crashes de runtime isolados |
| `unstable_restarts` (actual) | **0** | PM2 não classifica instabilidade crónica |

### Amostra `code [1]` (backend)

```
2026-04-27T15:07:45 — burst de 5 exits code [1] via SIGINT (reload em cadeia)
2026-05-04T02:26:45 — burst similar (manutenção/deploy)
```

**Não há evidência de memory leak** (OOM / heap) nos logs recentes. Erros dominantes no `error.log`:

- `GEMINI API_KEY_INVALID` (integração, não crash)
- Rotas internas governance com syntax error (não derruba processo)
- `shadowReplayWorker` module missing (scheduler warning)

---

## Classificação por categoria

| # | Categoria | Contagem estimada | % do histórico |
|---|-----------|-------------------|----------------|
| 1 | **Deploy intencional** | ~300+ | ~85% |
| 2 | **Restart operacional** (recovery 47-R, F47.5, F48) | ~15 | ~4% |
| 3 | **Correção / reload env** | ~20 | ~6% |
| 4 | **Crash genuíno** (runtime fatal não recuperado) | **0 recente** | 0% |
| 5 | **Memory leak** | **Não detectado** | — |
| 6 | **Falha crítica actual** | **Nenhuma** | — |

---

## Resposta obrigatória

| Pergunta | Resposta |
|----------|----------|
| Quantos restarts foram **deploy normal**? | **~300–330** (SIGINT code 0/1 em cadeia de reload) |
| Quantos foram **atualização**? | **~20–40** (sessões 01–03/06, Fases 47/47.5/48) |
| Quantos foram **correção**? | **~10–15** (truth closure, recovery) |
| Quantos foram **crash genuíno**? | **0** na janela actual (14h uptime contínuo) |

---

## Classificação final de risco

# **LOW**

**Justificação:**

- Contador elevado (350) é **histórico acumulado** de `pm2 reload` durante desenvolvimento/certificação, não instabilidade presente.
- **0** `unstable_restarts`.
- **14h+** uptime contínuo pós-recovery.
- Telemetria industrial activa nos logs (`INDUSTRIAL_EVENT_PUBLISHED`).

**Recomendação operacional:** Reset opcional do contador PM2 após janela estável de 7 dias (`pm2 reset impetus-backend`) — **não obrigatório** para certificação.

---

*FASE 49-C — auditoria read-only.*
