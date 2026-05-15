# Contextual governance — reload controlado de runtime (2026-05-12)

Consolidação em **runtime** das correções de contextualização cognitiva, gating de orquestração e personalização domain-safe do dashboard vivo. **Sem** migrações, alterações de base de dados, rebuild de semantic search, filas ou alteração ao motor de governance/policy.

---

## 1. Testes executados (pré-restart)

| Comando | Resultado |
|---------|-----------|
| `npm run test:contextual-domain-isolation` | 22 passed, 0 failed |
| `npm run test:live-dashboard-contextual` | 112 passed, 0 failed |

Execução no diretório `backend/`. Nenhum erro de sintaxe, import ou excepção nos cenários acima.

---

## 2. Backend restart

| Campo | Valor |
|--------|--------|
| Comando | `pm2 restart impetus-backend --update-env` |
| PID anterior | 2930095 |
| PID posterior | 2937288 |
| Estado PM2 após verificação | `online`, `unstable restarts: 0` |
| Script | `/var/www/impetus-completa/backend/src/server.js` |
| CWD | `/var/www/impetus-completa/backend` |

O processo Node foi terminado (`SIGINT` gracioso visível no log) e relançado, descarregando o `require` cache e carregando `liveDashboardService` (incl. `buildIntelligentSummary`, `canOrchestrate`), `dashboardProfileResolver` e dependências na versão actual do disco.

---

## 3. Frontend restart

**Não executado.** Nesta consolidação as alterações críticas residem no **backend** (resumos, orquestração, inferência de perfil/área). O serviço `impetus-frontend` manteve-se online sem `pm2 restart impetus-frontend --update-env`, evitando interrupção desnecessária.

**Recomendação:** após o reload do API, os clientes devem fazer **hard refresh** ou novo login para não verem cópias antigas em memória do browser (ver secção 5).

---

## 4. Health validation

| Endpoint | HTTP |
|----------|------|
| `http://127.0.0.1:4000/health` | 200 |
| `http://127.0.0.1:4000/api/health` | 200 |

Log de arranque (`impetus-backend-out.log`): servidor a escutar em `0.0.0.0:4000`, schedulers e proxies inicializados sem erro de módulo.

---

## 5. Contextual validation

- **Automatizado (offline):** os testes em `contextualDomainIsolationScenarios.js` cobrem financeiro, RH, `director_unassigned`, manutenção, resumo domain-safe e `canOrchestrate` deny-by-default.
- **Utilizadores reais (UAT):** validar manualmente em desktop/mobile após hard refresh:
  - **Financeiro:** não deve ver copy de “alertas operacionais” nem orquestração operacional activa quando o perfil/área for finance.
  - **RH:** idem para domínio RH.
  - **`director_unassigned`:** label “Direção”, não “Diretor de Operações” por defeito.
  - **Operações:** resumo e orquestração operacionais mantêm-se quando o domínio for explicitamente operacional.

---

## 6. Runtime observations

- Log `impetus-backend-out.log` pós-restart: arranque limpo com mensagem `[impetus-backend] http://0.0.0.0:4000`.
- `impetus-backend-error.log` (cauda inspeccionada): entradas pré-existentes (ex.: drift hierárquico, motores operacionais); **sem** stack trace de `Cannot find module` nem falha de export relacionada com `liveDashboardService` no momento do reload.
- **Não** foram executadas limpezas agressivas de cache de sistema nem `rm` em `dist`.

---

## 7. Perfis testados (suites)

| Perfil / persona | Cobertura |
|------------------|-----------|
| `finance_management` + área finance | Rótulo, resumo, orquestração |
| `hr_management` + área hr | Resumo domain-safe |
| `director_unassigned` | Sem área forçada para operações |
| `director_industrial` (manutenção) | Não finance |
| `director_operations` + `operations` | Orquestração permitida; copy operacional |
| Override `dashboard_profile` com área null | Prioridade do override |

---

## 8. Regressões encontradas

Nenhuma regressão detectada neste ciclo: testes críticos verdes, health 200, processo estável (`unstable restarts: 0`).

---

## 9. Estado final

**contextual governance runtime successfully reloaded**

Runtime Node do `impetus-backend` recarregado com PID novo; health endpoints operacionais; lógica contextual, gating de orquestração e inferência funcional alinhadas à política **deny-by-default** / **domain-safe** activas em memória. Próximo passo operacional recomendado: **hard refresh** (Chrome/Edge/mobile) ou logout/login para consolidar a experiência no cliente.
