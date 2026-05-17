# SAFETY Shadow Activation Deploy Report

**Data:** 2026-05-17  
**Tipo:** Enterprise Controlled Activation — SST/EHS Domain  
**Estado alvo:** **Enterprise Shadow Operational**  
**Decisão:** **GO — SHADOW ACTIVE** ✅

---

## Resumo executivo

Deploy shadow do domínio SST concluído com:

- flags activadas (idempotente);
- build frontend OK (55.30s);
- `pm2 reload` leve (frontend + backend, `--update-env`);
- smoke tests OK;
- readiness `shadow` com `definitive_publication: false` (correcto);
- sem erros SST nos logs pós-reload;
- coexistência legacy preservada (merge defensivo + try/catch Layout).

**Não executado:** migrations, pm2 delete, restart enterprise pesado, alterações estruturais.

---

## Fase 1 — Pre-flight

Ver: `backend/docs/safety-shadow-activation-preflight.md`

- Backend tests: **4/4**
- Frontend tests: **6/6**
- Rotas safety: **7/7** carregam
- Registry: `safety` = `active`

---

## Fase 2 — Backup leve

**Path:** `backend/backups/safety-shadow-activation-20260517T124458Z/`

| Conteúdo |
|----------|
| `env/backend.env`, `env/frontend.env.production`, `env/frontend.env` |
| `dist/frontend-dist-snapshot/` |
| `pm2/pm2-status.json` |
| `flags/runtime-flags-before.txt`, `runtime-flags-after.txt` |
| `logs/backend-error-tail.txt`, `frontend-error-tail.txt` |
| `reports/vite-build.log`, `smoke-post-reload.txt` |

---

## Fase 3 — Flags activadas

### Backend (`backend/.env`)

```env
IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED=true
IMPETUS_SAFETY_NAVIGATION_RUNTIME_ENABLED=true
IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED=true
IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED=true
IMPETUS_SAFETY_ACTIVATION_STAGE=shadow
```

**Aditivas (shadow enterprise):**

```env
IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=true
IMPETUS_SAFETY_RISK_MATRIX_ENABLED=true
IMPETUS_SAFETY_GHE_RUNTIME_ENABLED=true
```

### Frontend (`frontend/.env.production`, `frontend/.env`)

```env
VITE_IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED=true
VITE_IMPETUS_SAFETY_NAVIGATION_ENABLED=true
VITE_IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED=true
VITE_IMPETUS_SAFETY_OPERATIONAL_VISIBILITY_ENABLED=true
VITE_IMPETUS_SAFETY_GOVERNANCE_VISIBILITY_ENABLED=true
```

**Aditiva:** `VITE_IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED=true` (hub governança)

### Shadow readiness (validação local)

```json
{
  "readiness": { "ready": true },
  "activation_stage": "shadow",
  "definitive_publication": false,
  "flags": { "rollout_shadow": true }
}
```

---

## Fase 4 — Build

Ver: `backend/docs/safety-shadow-build-validation.md`

- **Exit 0**, 55.30s
- Chunks `Safety*` presentes no `dist/assets/`

---

## Fase 5 — Reload

| Processo | Acção | Resultado |
|----------|-------|-----------|
| `impetus-frontend` | `pm2 reload --update-env` | ✅ online |
| `impetus-backend` | `pm2 reload --update-env` | ✅ online |

Uptime pós-reload: ~25s estável, sem crash loop imediato.

---

## Fase 6 — Smoke tests

| Endpoint | HTTP | Avaliação |
|----------|------|-----------|
| `http://127.0.0.1:3000/` | 200 | ✅ |
| `/api/health` | 200 | ✅ |
| `/api/system/health/deep` | 200 | ✅ |
| `/api/safety-navigation/health` | 401 | ✅ (auth) |
| `/api/safety-operational/health` | 401 | ✅ |
| `/api/safety-governance/health` | 401 | ✅ |
| `/api/safety-telemetry/health` | 401 | ✅ |
| `/api/safety-cognitive/health` | 401 | ✅ |
| `/api/safety-rollout/health` | 401 | ✅ |
| `/api/safety-activation/health` | 401 | ✅ |

**404:** nenhum  
**500:** nenhum  

Log backend: **sem erros SST** nas últimas 30 linhas pós-reload.

---

## Fase 7 — Publication validation

### Comportamento esperado em shadow

- Runtime **activo** (APIs, rotas lazy, guards).
- Publicação de menu **bounded** — requer `safety_intelligence` em `visible_modules`.
- `definitive_publication: false` — estágio shadow; telemetria shadow via `noteQualityPublicationShadowEvent` equivalente SST.
- Menu merge: `safeMergeSafetyPublicationIntoMenu` após QUALITY, dentro de try/catch global.

### Perfis (validação lógica + testes)

| Perfil | Audiência | Densidade UX |
|--------|-----------|--------------|
| Operador | `operator` | compact |
| Técnico SST | `sst_technician` | tactical |
| Coordenador | `coordinator` | tactical |
| Diretor | `director` | executive |

### Coexistência legacy

| Módulo | Preservado |
|--------|------------|
| Dashboard | ✅ (menu fallback) |
| Impetus IA | ✅ (safe merge) |
| Impetus Chat | ✅ (safe merge) |
| QUALITY publication | ✅ (merge em cadeia) |

**Validação manual recomendada:** login com tenant que tenha `safety_intelligence` activo; confirmar itens SST no menu e rota `/app/safety/operational`.

---

## Fase 8 — Enterprise stability

| Check | Resultado |
|-------|-----------|
| `test:enterprise-runtime-stability` | **28/28** ✅ |
| PM2 restart storm pós-reload | ❌ não observado |
| Erros SST no log | ❌ não observado |
| safeMerge preserva base | ✅ (testes) |

---

## Fase 9 — Observação controlada

**Janela recomendada:** 15–30 minutos em produção.

Monitorizar:

```bash
pm2 list
pm2 logs impetus-frontend --lines 50 --nostream
pm2 logs impetus-backend --lines 50 --nostream
```

Critérios de alerta: 500 em `/api/safety-*`, "Erro em Dashboard", desaparecimento IA/Chat, restart loop PM2.

**Estado imediato pós-deploy:** CPU/memória estáveis; processos online.

---

## Fase 10 — Rollback plan

### Rollback rápido (sem restart pesado)

1. Restaurar env do backup:
   ```bash
   cp backend/backups/safety-shadow-activation-20260517T124458Z/env/backend.env backend/.env
   cp backend/backups/safety-shadow-activation-20260517T124458Z/env/frontend.env.production frontend/.env.production
   ```

2. Ou desactivar flags SST (todas `false`, `IMPETUS_SAFETY_ACTIVATION_STAGE=shadow` mantido).

3. Restaurar dist anterior (opcional):
   ```bash
   rm -rf frontend/dist
   cp -a backend/backups/safety-shadow-activation-20260517T124458Z/dist/frontend-dist-snapshot frontend/dist
   ```

4. Reload leve:
   ```bash
   pm2 reload impetus-frontend --update-env
   pm2 reload impetus-backend --update-env
   ```

**Tempo estimado:** &lt; 5 minutos.

---

## Fase 11 — GO / NO-GO

| Critério | Status |
|----------|--------|
| Pre-flight tests | ✅ |
| Backup criado | ✅ |
| Flags shadow | ✅ |
| Build | ✅ |
| Reload controlado | ✅ |
| Smoke health | ✅ |
| Readiness shadow | ✅ |
| Stability tests | ✅ |
| Sem regressão estrutural | ✅ |

## **DECISÃO: GO — SHADOW ACTIVE**

O SST está em **Enterprise Shadow Operational**:

- APIs montadas e protegidas por auth;
- publication runtime activo em modo shadow;
- **não** em full rollout;
- próximo passo: validação com utilizadores reais → `pilot` / `canary` / `staged` via `IMPETUS_SAFETY_ACTIVATION_STAGE`.

---

## Próximos passos (fora deste deploy)

1. Activar `safety_intelligence` no módulo do tenant piloto.
2. Validar menu + rotas com operador, técnico SST, coordenador, diretor.
3. `GET /api/safety-activation/orchestrate` (autenticado) — confirmar estágio.
4. Após 15–30 min estáveis → considerar `IMPETUS_SAFETY_ACTIVATION_STAGE=pilot` (não automático neste deploy).

---

## Referências

- `backend/docs/safety-enterprise-core.md`
- `backend/docs/domain-publication-framework.md`
- `backend/docs/ENTERPRISE_RUNTIME_STABILIZATION_REPORT.md`
