# ADR-013 — Runtime Oficial

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-INFRA-01

---

## Contexto

Backend implementa `gracefulShutdown` (SIGTERM/SIGINT, 12s watchdog, pool PG drain). PM2 `ecosystem.config.js` define kill_timeout 8s, autorestart, logs em `/root/.pm2/`.

---

## Problema

Definir runtime Enterprise alinhado ao código existente sem alterá-lo nesta certificação.

---

## Decisão

**Runtime Oficial Standard:**

| Aspecto | Contrato |
|---------|----------|
| Processos | backend :4000, frontend :3000, nginx :443 |
| Init order | PG → config validate → migrate → backend → frontend → nginx |
| Shutdown | SIGTERM; PM2 `kill_timeout` ≥ 12000ms (recomendado ops) |
| Health | `GET /health` 200; deep readiness admin-only |
| Recovery | PM2 autorestart max 10, delay 4s |
| User | `impetus` (não root) |

**Container (futuro):** tini + node; mesmo healthcheck; stop grace 15s.

---

## Consequências

- INFRA ops ajusta PM2 config no DATA-01 (não nesta cert)
- Schedulers permanecem in-process (single-instance)

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| systemd direct (sem PM2) | Perde ecossistema actual documentado |
| Kill -9 imediato | Perde graceful shutdown |
| Multi-instance backend sem redesign | Outbox in-memory não cluster-ready |

---

## Referências

- `backend/src/server.js` gracefulShutdown
- `ecosystem.config.js`
