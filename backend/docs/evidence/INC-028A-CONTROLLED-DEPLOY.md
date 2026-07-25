# INC-028A — Deploy Controlado + Restart PM2 (Backend)

**Timestamp UTC:** 2026-07-16T12:37:35Z  
**Modo:** DEPLOY_MODE=CONTROLLED | FAIL_SAFE=ENABLED | ROLLBACK_DECISION=HUMAN  
**Escopo:** activar INC-028 (`qualityTenantSignalLoader`) — **sem alteração de código/config/env**

---

## Resumo executivo

| Flag | Valor |
|------|-------|
| **PRECHECK** | **PASS** |
| **PM2_RESTART** | **PASS** |
| **HEALTH** | **PARTIAL** |
| **QUALITY_RUNTIME** | **PASS** |
| **REGRESSION** | **PASS** |
| **LOG_ERRORS** | **NONE** (críticos) |
| **FINAL_STATUS** | **SUCCESS** (com ressalvas HEALTH/UI) |

Restart único de `impetus-backend` (372 → 373). Frontend e demais processos **inalterados**. Runtime Quality em produção confirma **binding_ratio 0.875** pós INC-028.

---

## Etapa 1 — Pré-check

| Check | Resultado |
|-------|-----------|
| PM2 online | PASS |
| `impetus-backend` presente | PASS (id=3, pid=1951784) |
| Restart em andamento | PASS (nenhum) |
| Memória | PASS (~5.4 GiB available) |
| Disco `/` | PASS (17G livres, 83%) |
| Porta 4000 | PASS |
| Zombies | PASS (0) |

**Snapshot pré-restart:** ver `INC-028A-PRE-RESTART.md`

| Métrica | Valor pré |
|---------|-----------|
| uptime | ~23 min |
| restart count | 372 |
| rss (ps) | ~405 MiB |
| cpu | ~12% (momento amostra) |

---

## Etapa 2 — Snapshot

Documentado em `INC-028A-PRE-RESTART.md` (PM2 list, describe, logs, timestamp).

---

## Etapa 3 — Restart

```bash
pm2 restart impetus-backend --update-env
```

| Métrica | Antes | Depois |
|---------|-------|--------|
| restart count | 372 | **373** (+1) |
| pid | 1951784 | **1954044** |
| status | online | **online** |
| frontend ↺ | 18 | **18** (inalterado) |
| admin-portal ↺ | 2 | **2** (inalterado) |
| labs ↺ | 0 | **0** (inalterado) |

**PM2_RESTART = PASS** — incremento único, sem crash loop, `unstable_restarts: 0`.

---

## Etapa 4 — Health Check

| Endpoint (spec INC) | HTTP | Nota |
|---------------------|------|------|
| `GET /health` | **200** | OK |
| `GET /api/dashboard/me` | **200** | OK (auth Bearer session `manager_quality`) |
| `GET /api/bot-config` | **404** | Rota **não registada** no API principal |
| `GET /api/auth/me` | **404** | Rota **não registada** no API principal |

**Rotas reais equivalentes (pré-existentes, não alteradas nesta INC):**

| Endpoint alternativo | HTTP |
|----------------------|------|
| `GET /api/health` | **200** |
| `GET /api/impetus-admin/auth/bot-config` | **200** |

**HEALTH = PARTIAL** — core backend operacional; dois paths da spec INC não existem no router principal (`routes/auth.js` não expõe `GET /me`). **Não foi efectuado segundo restart.**

---

## Etapa 5 — Runtime Cognitivo (`/api/dashboard/me`)

**Utilizador:** `ricardo.souza@impetus.com.br`  
**Perfil:** `manager_quality`  
**company_id:** `511f4819-fc48-479e-b11e-49ba4fb9c81b`  
**Método:** sessão real via `createSession` + `GET /api/dashboard/me`

### Valores registados (payload real)

| Campo | Valor |
|-------|-------|
| **binding_ratio** | **0.875** |
| **promotion_applied** | **true** |
| **consolidation_applied** | **true** |
| **cockpit_mode** | **quality_native** |
| **runtime_name** | **quality_native** |
| **runtime_id** | **quality_cognitive_pilot_v1** |
| **quality_cognitive_centers** | **6** |
| **blocks_bound** | **7** |
| **blocks_empty** | **1** |
| **blocks_error** | **0** |
| **signal_load_ok** | **true** |
| **enrichment_phase** | **Z.20** |

### Excerpt `engine_bridge` (payload)

```json
{
  "binding_ratio": 0.875,
  "blocks_bound": 7,
  "blocks_empty": 1,
  "blocks_error": 0,
  "signal_load_ok": true
}
```

### Excerpt `specialized_cockpit_runtime`

```json
{
  "cockpit_mode": "quality_native",
  "consolidation_applied": true,
  "cognitive_health": {
    "specialization": 1,
    "usefulness": 0.976,
    "genericity": 0,
    "operational_focus": 0.667,
    "cognitive_density": 1,
    "healthy": true
  }
}
```

**Bloco NOT_BOUND (esperado):** `quality.supplier_intelligence` — sem dados de fornecedor no tenant (documentado INC-028).

**QUALITY_RUNTIME = PASS** — INC-028 activa em produção; ratio **0.875 ≥ 0.5**.

---

## Etapa 6 — Validação funcional

| Check | Resultado |
|-------|-----------|
| `GET http://127.0.0.1:3000/` | **200** (frontend online, não reiniciado) |
| `/api/dashboard/me` manager_quality | **200**, payload íntegro |
| CentroComando visual / JS / React / WS | **NÃO VALIDADO** nesta sessão (requer browser humano) |

**Nota:** validação visual do CentroComando fica pendente para o operador humano; backend e frontend respondem sem erro HTTP.

---

## Etapa 7 — PM2 pós-restart

| Métrica | Valor (~4 min pós-restart) |
|---------|----------------------------|
| status | online |
| pid | 1954044 |
| restarts | 373 (estável) |
| uptime | crescente (~4 min+) |
| rss | ~293 MiB |
| unstable_restarts | 0 |
| crash loop | **ausente** |

---

## Etapa 8 — Logs

Inspecção `pm2 logs impetus-backend --lines 200` pós-restart:

| Padrão crítico | Encontrado |
|----------------|------------|
| UnhandledPromiseRejection | NÃO |
| ReferenceError / TypeError / SyntaxError | NÃO |
| Module not found / Import error | NÃO |
| Circular dependency | NÃO |
| Database connection failure | NÃO |
| Redis failure | NÃO |
| OOM / Killed / Crash | NÃO |

**Avisos pré-existentes (não críticos):** `[DB][POOL_PRESSURE]`, `[SEC-05_BOOT]`, `[APPSEC_RUNTIME_CONFIG]`

**LOG_ERRORS = NONE** (críticos)

---

## Etapa 9 — Regressão multi-domínio

Perfis testados via `/api/dashboard/me` (200 OK):

| Perfil | Runtime dominante | Quality pilot |
|--------|-------------------|---------------|
| `manager_production` | production ✓, executive ✓ | presente (shadow) |
| `manager_maintenance` | maintenance ✓ | presente (shadow) |
| `ceo_executive` | executive ✓ | presente (shadow) |
| `manager_environmental` | — (sem user activo) | — |
| `hr_management` | — (sem user activo) | — |

**Conclusão:** domínios com utilizadores activos mantêm os seus runtimes; nenhuma regressão detectada no restart INC-028.

**REGRESSION = PASS**

---

## Etapa 10 — Matriz final

```
PRECHECK              = PASS
PM2_RESTART           = PASS
HEALTH                = PARTIAL
QUALITY_RUNTIME       = PASS
BINDING_RATIO         = 0.875
PROMOTION_APPLIED     = true
CONSOLIDATION_APPLIED = true
COCKPIT_MODE          = quality_native
QUALITY_CENTERS       = 6
REGRESSION            = PASS
LOG_ERRORS            = NONE
FINAL_STATUS          = SUCCESS
```

### Ressalvas documentadas

1. **HEALTH PARTIAL:** `/api/bot-config` e `/api/auth/me` retornam 404 no API principal (gap de rota pré-existente; bot-config disponível em `/api/impetus-admin/auth/bot-config`).
2. **UI:** validação visual CentroComando (`manager_quality`) pendente operador humano.
3. **supplier_intelligence:** continua `bound_empty` por ausência de dados reais de fornecedor — comportamento correcto INC-028.

---

## Ficheiros de evidência

| Documento | Conteúdo |
|-----------|----------|
| `INC-028A-PRE-RESTART.md` | Snapshot pré-restart |
| `INC-028A-CONTROLLED-DEPLOY.md` | Este relatório |
| `INC-028-QUALITY-SIGNAL-RECONCILIATION.md` | Implementação reconciliada |

---

## Decisão

Deploy controlado **concluído com sucesso**. INC-028 activa em produção. **Nenhum rollback necessário.** Rollback, se requerido pelo operador humano, seria via `pm2 restart impetus-backend` após revert git — **não executado nesta INC**.
