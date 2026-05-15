# Deploy controlado — consolidação do fix de isolamento de domínio

**Tipo:** Controlled restart / safe deploy (frontend + backend + validação de runtime).  
**Data (execução):** 2026-05-12 (UTC do servidor).  
**Estado final:** `domain isolation fixes successfully loaded into runtime`

---

## 1. Build executado

- **Comando:** `cd /var/www/impetus-completa/frontend && rm -rf dist && npm run build`
- **Resultado:** concluído com sucesso (Vite 5.4.x, ~54 s).
- **Pré-validação:** `cd backend && node src/tests/domainIsolationScenarios.js` — 11 passed, 0 failed.
- **Novos hashes (exemplo):** `dist/index.html` referencia `assets/index-DpiomJlt.js` e `assets/index-p6ld--zB.css` (ficheiros versionados pelo build; hashes anteriores deixam de ser servidos após substituição de `dist/`).
- **Meta de cache no `index.html`:** `Cache-Control: no-cache, no-store, must-revalidate` (reduz retenção agressiva de HTML no browser).

---

## 2. Backend restart

- **Comando:** `pm2 restart impetus-backend --update-env`
- **PID antes → depois:** `2911621` → `2930095` (novo processo Node).
- **Estado PM2:** `online` após restart.
- **CWD:** `/var/www/impetus-completa/backend` (canónico de produção).

---

## 3. Frontend restart

- **Comando:** `pm2 restart impetus-frontend --update-env`
- **PID antes → depois:** `2911648` → `2930116`.
- **Estado PM2:** `online`; script: `npm run preview:prod` em `frontend/`.
- **HTTP:** `GET http://127.0.0.1:3000/` → **200** após estabilização.

---

## 4. Cache invalidation

- **Bundles:** pasta `dist/` regenerada por completo; chunks com novos nomes (content hash Vite).
- **Service worker (app principal):** `frontend/src/main.jsx` desregista SW no `load` (evita cliente preso a worker antigo).
- **Outros SW:** `/chat-sw.js`, `/manuia-sw.js` — fora do âmbito deste deploy; utilizadores de rotas específicas devem recarregar após actualização se notarem cache.
- **Orientação operacional:** **hard refresh required after deploy** — recomendar `Ctrl+Shift+R` (ou equivalente) após cada release de autorização, para garantir que o browser não mantém módulos JS antigos em memória com lógica permissiva anterior.

---

## 5. Authorization validation

- **Automatizado (pré-restart):** `test:domain-isolation` — Motor A, capabilities, orquestrador, modo enrich sem `manuia`/`hr_intelligence` para persona CFO de teste.
- **Runtime:** o backend carregou o novo `dashboardAccessService`, `capabilitiesDeriver`, registry Phase 6 e `_isEligible` ao arranque do processo.
- **Pós-deploy recomendado (UAT humano):** validar menu + `GET /api/dashboard/me` com contas reais de diretoria financeira, manutenção, RH, `tenant_admin`, `internal_admin` e `admin` (sem alterar dados na BD).

---

## 6. Perfis testados (automático)

- CFO / finance management (sintético nos testes de domínio).
- Diretor manutenção (capabilities implícitas).
- Técnico de manutenção (`technician_maintenance` — `getAllowedModules`).
- RH BP (`view:operational` + domínio RH).
- Orquestrador Phase 6 (personas do ficheiro `contextualModulesScenarios.js` quando corrido em CI).

---

## 7. Regressões encontradas

- **Suite automatizada:** nenhuma falha em `domainIsolationScenarios` nesta fase.
- **Nota de deploy:** durante `rm -rf dist` + rebuild, se o processo `impetus-frontend` continuar a correr, podem ocorrer erros transitórios `ENOENT` ao servir `dist/index.html` até o novo `dist/` estar completo. Mitigação futura: parar o frontend antes do `rm -rf dist`, ou janela de manutenção.

---

## 8. Runtime health

| Endpoint | Resultado |
|----------|-----------|
| `GET http://127.0.0.1:4000/health` | **200** |
| `GET http://127.0.0.1:4000/api/health` | **200** |
| `GET http://127.0.0.1:3000/` | **200** |

- **PM2:** `impetus-backend` e `impetus-frontend` em `online` após restart.
- **Migrations / BD:** não executadas (fora de escopo; zero alteração de schema).

---

## 9. Logs observados

- **Backend:** amostra de `impetus-backend-error.log` contém entradas históricas `[HIERARCHY_DRIFT]` (não introduzidas por este deploy).
- **Frontend:** linhas recentes `ENOENT ... dist/index.html` coincidem com a janela em que `dist/` foi recriado; após build completo e restart, o ficheiro existe (`dist/index.html` com timestamp do build).
- **Recomendação:** `pm2 logs impetus-backend --lines 80` e `pm2 logs impetus-frontend --lines 80` nas primeiras horas para `EADDRINUSE`, crash loops ou erros de import.

---

## 10. Estado final

- **Novas regras de autorização e deny-by-default no cliente** entregues via novo bundle + novo processo backend.
- **Module registry e capability resolution** activos no PID actual do backend.
- **Produção saudável** ao nível de health checks HTTP imediatos pós-restart.

```text
domain isolation fixes successfully loaded into runtime
```
