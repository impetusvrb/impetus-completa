# Deploy controlado — Domain Authority Engine (Fase C)

**Data/hora:** 2026-05-18 ~20:22–20:26 UTC  
**Operador:** deploy automatizado (SRE playbook)  
**Ambiente:** produção local (`/var/www/impetus-completa`)  
**Rollback executado:** NÃO

---

## 1. Estado antes

| Processo | PID | Uptime | Restarts | Memória | Status |
|----------|-----|--------|----------|---------|--------|
| impetus-backend | 3712728 | ~2h | 146 | ~115 MB | online |
| impetus-frontend | 3712709 | ~2h | 78 | ~58 MB | online |
| lipsync-api | 766 | 39D | 0 | ~27 MB | online (não reiniciado) |

### Saúde HTTP (pré)

| Endpoint | Resultado |
|----------|-----------|
| `http://localhost:4000/health` | HTTP 200 |
| `http://localhost:4000/api/health` | HTTP 200 |
| `http://localhost:3000/` | HTTP 200 |

### Runtime antigo (pré-reload)

- `GET /api/dashboard/me` sem token → `AUTH_TOKEN_MISSING` (esperado; sem invalidar sessões).
- `GET /api/system/frontend-build` → `build_id: bmpbi06ib`, `built_at: 2026-05-18T17:50:01.855Z`
- Código Fase C presente em disco; reload necessário para garantir módulos em memória.

---

## 2. Backup enterprise

**Localização:** `/var/www/impetus-completa/backups/domain-authority-deploy-20260518-202254/`

| Artefacto | Estado |
|-----------|--------|
| `frontend/dist/` | OK (~107 MB) |
| `backend/.env` | OK |
| `backend/package.json` | OK |
| `ecosystem.config.js` | OK (se existir) |
| `pm2/process-list.json` | OK |
| `pm2 save` | Executado |

**Swap atómico anterior preservado:** `frontend/dist_backup_1779135942827` (criado pelo build:atomic deste deploy).

---

## 3. Testes (pré-deploy — ABORT criteria)

| Suíte | Resultado |
|-------|-----------|
| `test:domain-contextual-regression` | **49 passed**, 0 failed |
| `test:contextual-functional-axis` | **37 passed**, 0 failed |
| `test:contextual-domain-isolation` | **22 passed**, 0 failed |
| `test:enterprise-hardening` | **20 passed**, 0 failed |
| `test:enterprise-internal-network` | **12 passed**, 0 failed |
| Frontend `domainIsolationExpectations.test.cjs` | **5 passed**, 0 failed |

**Total:** 145+ asserções verdes — deploy autorizado.

### Migrations

```bash
npm run migrate:status
```

- `destructive allowed: false`
- Histórico íntegro (sem pending destrutiva detectada)
- **Nenhuma migration executada** neste deploy (não necessário para Fase C)

---

## 4. Build frontend (atómico)

```bash
cd frontend && npm run build:atomic
```

| Campo | Valor |
|-------|-------|
| `build_id` (novo) | **bmpbnkknn** |
| `built_at` | 2026-05-18T20:25:42.556Z |
| `assets_hash` | bmpbnkknn |
| Bundles JS em `dist/assets/` | **75** |
| `dist/index.html` | OK |
| Método | `dist_next` → swap atómico (sem `rm -rf dist` manual) |

**Build anterior:** `bmpbi06ib` (backup em `dist_backup_1779135942827`).

---

## 5. Reload controlado

| | Backend | Frontend |
|---|---------|----------|
| Comando | `pm2 reload impetus-backend --update-env` | `pm2 reload impetus-frontend --update-env` |
| PID anterior | 3712728 | 3712709 |
| PID novo | **3725151** | **3725182** |
| Restarts após reload | 147 | 79 |
| Downtime | Mínimo (reload graceful) | Mínimo |
| lipsync-api | **Não reiniciado** (PID 766 preservado) | — |

**Flags de runtime:** `IMPETUS_DOMAIN_AUTHORITY` default `on` (Domain Authority activo).

---

## 6. Validação pós-deploy

### Saúde HTTP (pós)

| Endpoint | Resultado |
|----------|-----------|
| `/health` | HTTP 200 |
| `/api/health` | HTTP 200 |
| `localhost:3000/` | HTTP 200 |
| `/api/system/frontend-build` | `build_id: bmpbnkknn` ✓ |

### Domain Authority em runtime (simulação personas)

| Persona | `functional_axis` | Perfil | `quality_intelligence` | `environment_intelligence` | `manuia` | `hr_intelligence` |
|---------|-------------------|--------|------------------------|----------------------------|----------|-------------------|
| Coordenador Meio Ambiente | environmental | coordinator_environmental | ❌ | ✅ | ❌ | ❌ |
| Gerente RH | hr | manager_hr | ❌ | ❌ | ❌ | ✅ |
| Diretor Financeiro | finance | director_financial | ❌ | ❌ | ❌ | ❌ |
| Coordenador Qualidade | quality | coordinator_quality | ✅ | ❌ | ❌ | ❌ |
| Coordenador Jurídico | legal | coordinator_legal | ❌ | ❌ | ❌ | ❌ |
| Coordenador Manutenção | maintenance | coordinator_maintenance | ❌ | ❌ | ✅ | ❌ |

Todos os payloads incluem `domain_authority` com `DOMAIN_AUTHORITY_RESOLVED` nos logs.

### Teste de isolamento inject (pré-reload em disco)

Input: `quality_intelligence` + `environment_intelligence` para eixo ambiental  
→ `DOMAIN_MODULE_DENIED` + remoção de `quality_intelligence` ✓

### PM2 final

```
impetus-backend   online   PID 3725151   ~127 MB
impetus-frontend  online   PID 3725182   ~59 MB
lipsync-api       online   PID 766       (inalterado)
```

- Zero restart loop pós-deploy
- Pós-deploy smoke: `test:domain-contextual-regression` → 49 passed

---

## 7. Observabilidade

Tags activos (JSON parseável):

- `DOMAIN_AUTHORITY_RESOLVED`
- `DOMAIN_ISOLATION_BLOCKED`
- `DOMAIN_MODULE_DENIED`
- `FUNCTIONAL_AXIS_INFERRED`
- `FUNCTIONAL_AXIS_MANUAL_PRIORITY`
- `ENVIRONMENTAL_AXIS_RESOLVED`

Monitorização recomendada (15–30 min):

```bash
pm2 logs impetus-backend --lines 100 | grep -E 'DOMAIN_|FUNCTIONAL_AXIS|Error'
```

**Não observado neste deploy:** exceptions, recursion, undefined module, contaminação quality→ambiental.

---

## 8. Preservação de garantias

| Garantia | Estado |
|----------|--------|
| Tenants / sessões / JWT | Preservados (sem flush, sem delete PM2) |
| Motor A/B | Intacto |
| Design System / CSS | Sem alteração estrutural |
| Governança admin | Intacta |
| Internal network governance | Testes 12/12 OK |
| Build version guard | `bmpbnkknn` activo |

---

## 9. Rollback (documentado — NÃO executado)

### Frontend

```bash
# Restaurar dist do backup deste deploy
BACKUP=/var/www/impetus-completa/backups/domain-authority-deploy-20260518-202254
rm -rf /var/www/impetus-completa/frontend/dist
cp -a "$BACKUP/frontend/dist" /var/www/impetus-completa/frontend/dist
pm2 reload impetus-frontend --update-env
```

Ou usar `dist_backup_1779135942827` se preferir build imediatamente anterior.

### Backend (desactivar Domain Authority sem reverter código)

```bash
export IMPETUS_DOMAIN_AUTHORITY=off
pm2 reload impetus-backend --update-env
```

### PM2

- **PROIBIDO:** `pm2 delete`
- Restaurar lista: `pm2 resurrect` (após `pm2 save` do backup se necessário)

---

## 10. Conclusão

Deploy **bem-sucedido**. O IMPETUS está:

- Online e saudável (HTTP 200)
- Com **Domain Authority Engine** activo em runtime
- Com **isolamento contextual formal** validado por personas
- Sem downtime relevante (reload graceful)
- Com deploy **reversível** via backup + flag `IMPETUS_DOMAIN_AUTHORITY=off`

**Próximo passo recomendado (humano):** login com utilizador real ambiental e confirmar menu + `GET /api/dashboard/me` autenticado contém `domain_authority` e ausência de módulos quality.
