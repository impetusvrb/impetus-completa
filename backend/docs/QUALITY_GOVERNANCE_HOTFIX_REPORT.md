# QUALITY GOVERNANCE HOTFIX — Relatório Enterprise

**Data:** 2026-05-16  
**Escopo:** Restaurar mount de `/api/quality-governance`  
**Veredicto:** **GO**

---

## 1. Root cause

| Campo | Detalhe |
|--------|---------|
| **Erro** | `ReferenceError: subgroupStats is not defined` |
| **Ficheiro** | `backend/src/domains/quality/governance/spc/qualityControlChartEngine.js` |
| **Linha** | 59 (`module.exports`) |
| **Causa** | Re-export de `subgroupStats` no `module.exports` sem import correspondente de `./qualitySpcEngine`. A função existe e é exportada em `qualitySpcEngine.js` (linha 125); apenas faltava no destructuring da linha 3. |

### Cadeia de falha no bootstrap

```
server.js → useRoute('/api/quality-governance', './routes/qualityGovernance')
  → qualityGovernanceOrchestrator.js
    → qualityControlChartEngine.js (avaliação de module.exports)
      → ReferenceError: subgroupStats is not defined
```

### Por que os testes isolados passaram

A suite `test:quality-governance-runtime` importa diretamente `qualitySpcEngine`, analytics e orquestrador por caminhos que **não** avaliam o `module.exports` completo de `qualityControlChartEngine.js` no momento do `require`. O erro só aparece quando Node.js **compila e avalia** o objeto `module.exports` do chart engine (fase de carga do módulo), o que ocorre no `require` da rota no boot do `server.js`.

### Impacto

- Rota `/api/quality-governance` **não montada** (404 em todos os endpoints).
- Domínios quality operacionais, telemetry, cognitive e rollout **não afetados**.
- Sem impacto em backbone, observability, authority ou feature flags.

### Risco do hotfix

**Mínimo** — uma linha: adicionar `subgroupStats` ao import existente. Sem alteração de lógica SPC, payloads ou contratos.

---

## 2. Correção aplicada

**Ficheiro:** `backend/src/domains/quality/governance/spc/qualityControlChartEngine.js`

```diff
-const { mean, evaluateSubgroupsSpc } = require('./qualitySpcEngine');
+const { mean, evaluateSubgroupsSpc, subgroupStats } = require('./qualitySpcEngine');
```

`subgroupStats` permanece re-exportado em `module.exports` (compatibilidade com consumidores que importem do chart engine).

---

## 3. Validações executadas

### Fase 1 — Root cause

- [x] `grep subgroupStats` no backend
- [x] Stack trace: `qualityControlChartEngine.js:59:3`
- [x] Módulo exportador identificado: `qualitySpcEngine.js`

### Fase 2 — Hotfix

- [x] Import mínimo (sem refactor, sem alteração de runtime SPC)

### Fase 3 — Governance route validation

- [x] `node -e "require('./src/routes/qualityGovernance')"` → **OK**
- [x] Exports do chart engine: `pChartLimits`, `cChartLimits`, `buildXbarEvaluation`, `subgroupStats` (function)
- [x] Mount em `server.js` linha ~379 (`requireAuth`, `requireCompanyActive`, limiter) — inalterado

### Fase 4 — Smoke / testes

| Verificação | Resultado |
|-------------|-----------|
| `npm run test:quality-governance-runtime` | **OK** (0 FAIL) |
| X-bar, SPC, Cpk, FMEA, scorecard fornecedor | 5/5 cenários ✅ |

### Fase 5 — Enterprise reload

```bash
pm2 reload impetus-backend --update-env
```

| Endpoint | HTTP | Interpretação |
|----------|------|----------------|
| `/health` | 200 | OK |
| `/api/health` | 200 | OK |
| `/api/quality-governance/health` | **401** | Rota **montada** (auth exigida no mount global) |

**Antes do hotfix:** `/api/quality-governance/health` → **404** (rota ausente).

### Fase 6 — Observação pós-hotfix (imediata)

| Métrica | Valor |
|---------|--------|
| PM2 `impetus-backend` | `online` |
| Uptime pós-reload | ~4s (no momento do check) |
| Memória | ~94 MB |
| `unstable_restarts` | 0 |
| Novo `subgroupStats` no error log pós-reload | **Não** |
| Boot log | `http://0.0.0.0:4000` sem `Rota não carregada` |

**Ruído pré-existente (fora do escopo):** aviso `JWT_SECRET` entropia; logs históricos `[HIERARCHY_DRIFT]`, `[LIVE_DASHBOARD]` — não introduzidos por este hotfix.

**Recomendação:** janela de observação 15–30 min em produção (restarts, WARN/ERROR, governance metrics, websocket, DLQ).

---

## 4. Regressions check

| Área | Regressão |
|------|-----------|
| Quality operational | Nenhuma |
| Telemetry / cognitive / rollout | Nenhuma |
| Frontend / App.jsx | Não alterado |
| Migrations / PM2 frontend | Não alterado |
| Contratos SPC / analytics | Preservados |

---

## 5. Veredicto final

### **GO**

A rota `/api/quality-governance` volta a carregar no bootstrap do backend. Hotfix de uma linha, compatível com runtime enterprise estabilizado. Nenhuma alteração arquitetural, de flags, UX ou backbone.

---

*Gerado automaticamente no âmbito do hotfix enterprise controlado — Impetus QUALITY Governance.*
