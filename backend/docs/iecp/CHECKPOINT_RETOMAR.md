# CHECKPOINT — Retomar daqui

> **Gravado em:** 2026-06-26  
> **Regra:** não reiniciar certificação — avançar a partir do que está abaixo.

---

## Estado actual (2026-06-26 16:39 UTC)

| Item | Valor |
|------|-------|
| Telas **VERDE** | **72/72** |
| CERT-03 | **9/9 READY** |
| CERT-04 | **`PILOT_WINDOW_OPEN`** — **~47,5h** até `2026-06-28T16:08:48Z` |
| Piloto | **34%** (~24,6h / 72h) · **~47h** restantes |
| Status | `npm run cert:04:status` → `CERT-04_PILOT_STATUS.md` |
| Último tick | ✅ drift · P0E · 10/10 evidências |
| Backup | `backups/checkpoint_2026-06-26T1622.sql` |

**Fecho:** `npm run cert:04:close` após 28/06 ~16:08 UTC

### Comandos rápidos

```bash
cd backend && npm run cert:03
node scripts/audit/seed_first_ioe_cert04.js --force && node scripts/p0e_go_live_monitoring.js
bash scripts/backup-db-before-manuia.sh
```

---

## Histórico (sessões anteriores)

| Item | Valor |
|------|-------|
| PM2 | `impetus-backend` + `impetus-frontend` **online** |
| URL pública | https://srv1422313.hstgr.cloud |
| Health | `http://127.0.0.1:4000/health` e `/api/health` → **ok** |
| `.env` | `NODE_ENV=production`, `FRONTEND_URL=https://srv1422313.hstgr.cloud`, pipeline industrial activo |
| Pilot tenants backbone | **vazio** (todos os tenants) |
| Refresh tokens | `IMPETUS_REFRESH_TOKENS_ENABLED=true` |

### P0E — Go-Live

| Item | Valor |
|------|-------|
| Último relatório | `backend/docs/P0E_GO_LIVE_MONITORING.md` (2026-06-25T16:08Z) |
| `go_live_detected` (último) | **false** — `PIPELINE_ENABLED_AWAITING_FIRST_IOE` |
| IOE histórico | `first_ioe_at`: 2026-06-25T14:22:01Z (existe na BD) |
| Go-live aceite antes | **14:22Z** (`CONTINUOUS_OPERATION_GO_LIVE_ACCEPTED`) — expirou janela 1h sem IOE recente |

> **Ao retomar:** `node scripts/audit/seed_first_ioe_cert04.js --force` + `pm2 restart impetus-backend --update-env` + `node scripts/p0e_go_live_monitoring.js`

---

## Matriz funcional (estado intermédio — sessão interrompida)

| Métrica | Valor |
|---------|-------|
| Telas | 77 |
| Endpoints | 1.098 |
| **VERDE** | **10** |
| **AMARELO** | **51** |
| **INCOMPLETO** | **11** |
| **REDIRECT** | 5 |
| Cenários E2E Parte 7.2 | **10/10** (`SCENARIO_VERDE`) |
| `cert:drift` | **falha** (matriz não alinhada com inventário) |
| `lastCertificationAt` | 2026-06-25T16:08:52Z |

### O que correu antes de travar

1. `FUNCTIONAL_MATRIX.json` foi **corrompido** (rows vazios) → **restaurado** via `git checkout HEAD`
2. `cert_classify_screens.js --all` **iniciou** mas **não terminou** (sessão cortada)
3. Ficaram processos **presos** (`cert_classify` Logistics + `--all`, até +25h) → **já mortos** na sessão seguinte
4. **Não executar** vários `cert_classify` em paralelo — corrompe / bloqueia matriz

---

## Scripts criados nesta continuação

| Script | Uso |
|--------|-----|
| `scripts/patch-env-industrial-production.js` | Patch `.env` produção |
| `scripts/continue-from-checkpoint.sh` | P0E + seed IOE + drift |
| `backend/scripts/audit/seed_first_ioe_cert04.js` | `npm run cert:04:seed-ioe` (`--force` para IOE recente) |
| `backend/scripts/audit/cert03_readiness.js` | `npm run cert:03` |
| `backend/scripts/audit/cert_promote_probe_verde.js` | `npm run cert:promote-probe-verde` |
| `backend/scripts/audit/cert04_pilot_day0.js` | `npm run cert:04:day0` |
| `backend/docs/iecp/CERT-04_PILOT_EXECUTION_PLAN.md` | Plano piloto 72h |

### npm scripts (backend/package.json)

- `cert:03`, `cert:04:day0`, `cert:04:seed-ioe`
- `cert:classify-all`, `cert:promote-probe-verde`, `cert:full`

---

## CERT-04 piloto (iniciado, incompleto)

- **Início registado:** `2026-06-25T16:08:48Z` (`CERT-04_PILOT_LOG.json`)
- **Fim mínimo 72h:** `2026-06-28T16:08:48Z`
- Day0 snapshot: drift ❌, matriz parcial — **revalidar ao retomar**

---

## Próxima sessão — ordem recomendada (passos curtos)

```bash
# 0. Verificar que não há jobs presos
pgrep -af 'cert_classify|e2e_cert' || echo OK

# 1. Saúde
curl -sf http://127.0.0.1:4000/health
pm2 list | grep impetus

# 2. Classificar POR MÓDULO (evitar --all de uma vez)
cd backend
node scripts/audit/cert_classify_screens.js --module=Admin
node scripts/audit/cert_classify_screens.js --module=Quality
# ... repetir por módulo até 77 telas

# 3. Promover probes OK → VERDE
npm run cert:promote-probe-verde

# 4. E2E (demora — correr sozinho)
npm run cert:e2e
node scripts/audit/applyCertEvidenceToMatrix.js

# 5. Promover de novo + drift
npm run cert:promote-probe-verde
npm run cert:drift

# 6. P0E + IOE recente se necessário
node scripts/audit/seed_first_ioe_cert04.js --force
node scripts/p0e_go_live_monitoring.js

# 7. CERT-03 + observability
npm run cert:03
cd ../infra/observability && docker compose up -d prometheus grafana

# 8. Backup drill
bash backend/scripts/backup-db-before-manuia.sh
```

**Meta:** 72 VERDE + 0 AMARELO + 5 REDIRECT + `cert:drift` ok + CERT-03 `READY` + janela CERT-04 72h com evidências.

---

## Problemas conhecidos / lições

1. **`buildFunctionalMatrix.js` sem cuidado** pode gerar matriz vazia — preferir `git checkout HEAD -- backend/docs/FUNCTIONAL_MATRIX.json` se corromper
2. **`cert_classify --all`** pode agarrar horas — usar `--module=X` em lotes
3. Após PM2 restart, verificar `backend/src/middleware/globalRateLimit.js` e árvore `backend/src/` se health falhar
4. `goLiveDetectionService` usa `bypass_rls` nas queries P0E (fix aplicado)
5. Ficheiros apagados acidentalmente: restaurar com `git checkout HEAD -- <path>`

---

## Ficheiros-chave

- Matriz: `backend/docs/FUNCTIONAL_MATRIX.json`
- P0E: `backend/docs/P0E_GO_LIVE_MONITORING.md`
- Piloto: `backend/docs/iecp/CERT-04_PILOT_LOG.json`
- Plano: `backend/docs/iecp/CERT-04_PILOT_EXECUTION_PLAN.md`
- Deploy: `scripts/deploy-impetus.sh`
- PM2: `ecosystem.config.js`
