# RELATÓRIO — QUALITY Publication Activation Deploy (controlado)

**Data (UTC):** 2026-05-16  
**Tipo:** ativação de publicação / rollout controlado (sem alteração estrutural)  
**Backup leve:** `backend/backups/quality-publication-activation-20260516T225757Z/`

---

## 1. Escopo e conformidade

| Restrição solicitada | Estado |
|----------------------|--------|
| Sem `pm2 delete`, sem `kill -9`, sem restart enterprise pesado | **Conforme** (`pm2 reload … --update-env` apenas) |
| Sem migrations / schema / dados | **Conforme** |
| Variáveis idempotentes (sem duplicar chaves alvo) | **Conforme** (merge por chave; comentários preservados fora das linhas substituídas) |

---

## 2. Backup leve (Fase 1)

**Diretório:** `backend/backups/quality-publication-activation-20260516T225757Z/`

| Artefacto | Conteúdo |
|-----------|----------|
| `env/backend.env` | Cópia de `backend/.env` **antes** do merge (rollback imediato de flags + resto do ficheiro) |
| `env/frontend.env.production` | Estado anterior de `frontend/.env.production` |
| `dist/` | Snapshot de `frontend/dist` se existia no momento do backup; caso contrário nota em `README-no-dist-at-backup.txt` |
| `pm2/` | `jlist.json`, `describe-backend.txt`, `describe-frontend.txt`, e pós-deploy `describe-*-post.txt` |
| `logs/` | Tail PM2 (backend/frontend, `--nostream`) |
| `flags/` | `*-quality-flags-pre.txt` / `*-post.txt` |
| `reports/` | Smokes, log do Vite build, testes de activação, `enterprise-final-readiness.log`, listagem de chunks QUALITY |

---

## 3. Flags activadas (Fase 2)

### Backend (`backend/.env`)

- `IMPETUS_QUALITY_NAVIGATION_RUNTIME_ENABLED=true`
- `IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED=true`
- `IMPETUS_QUALITY_UNIVERSAL_RUNTIME_ENABLED=true`
- `IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=true`
- `IMPETUS_QUALITY_GOVERNANCE_RUNTIME_ENABLED=true`

### Frontend — produção (`frontend/.env.production`)

- `VITE_IMPETUS_QUALITY_NAVIGATION_ENABLED=true`
- `VITE_IMPETUS_QUALITY_PUBLICATION_RUNTIME_ENABLED=true`
- `VITE_IMPETUS_QUALITY_OPERATIONAL_VISIBILITY_ENABLED=true`
- `VITE_IMPETUS_QUALITY_GOVERNANCE_VISIBILITY_ENABLED=true`
- `VITE_IMPETUS_QUALITY_EXECUTIVE_VISIBILITY_ENABLED=true`

### Frontend — ficheiro pedido (`frontend/.env`)

O repositório não tinha `frontend/.env` antes deste deploy; foi **criado** com as mesmas chaves `VITE_IMPETUS_QUALITY_*` acima (alinhado ao pedido e ao carregamento Vite em desenvolvimento).

---

## 4. Pré-condições e smoke HTTP (Fases 3 e 6)

**Host verificado:** `http://127.0.0.1:4000` (curl anónimo).

| Rota | Pré-reload | Pós-reload | Interpretação |
|------|------------|------------|----------------|
| `/health` | 200 | 200 | OK |
| `/api/health` | 200 | 200 | OK |
| `/api/system/health/deep` | 200 | 200 | OK |
| `/api/quality-navigation/health` | 401 | 401 | Rota montada; exige contexto autenticado (aceitável; **nunca** 404/500) |
| `/api/quality-operational/health` | 401 | 401 | Idem |
| `/api/quality-governance/health` | 401 | 401 | Idem |
| `/api/quality-cognitive/health` | 401 | 401 | Idem |
| `/api/quality-rollout/health` | 401 | 401 | Idem |

Detalhe em: `reports/smoke-pre-reload.txt`, `reports/smoke-post-reload.txt`.

---

## 5. Build frontend (Fase 4)

- **Comando:** `npm run build` (raiz `frontend/`)
- **Resultado:** concluído com sucesso (~48s); sem erro fatal do Vite.
- **Chunks QUALITY presentes no artefacto** (nomes do build): listados em `reports/chunks-quality-listing.txt`, incluindo hubs/runtime operacional, governance, cognitive, rollout, telemetry, kiosk, inspecção, offline, workspace.

Aviso de tamanho de chunk (>500 kB) é **informativo** do Rollup; não indica corrupção nem falha de lazy loading.

---

## 6. PM2 — reload controlado (Fase 5)

- `pm2 reload impetus-backend --update-env` — **OK**
- `pm2 reload impetus-frontend --update-env` — **OK**
- Estado pós-operação: processos **online**; incremento de contador de reload esperado.

Observação operacional: histórico de `↺` elevado no host já existia antes deste deploy; esta operação **não** utilizou `pm2 delete` nem kill forcado.

---

## 7. Testes automatizados pós-deploy

| Suite | Resultado |
|-------|-----------|
| `npm run test:quality-publication-activation` (backend) | 4 ok, 0 fail |
| `npm run test:quality-publication-activation` (frontend) | 4 ok, 0 fail |
| `npm run test:enterprise-final-readiness` (backend) | **READY WITH RESTRICTIONS** (avisos P2, P9–P16; ver `reports/enterprise-final-readiness.log`) |

Pontos relevantes do readiness: avisos estáticos (revisão manual NODE_ENV, chunks, cardinalidade, PM2 ecosystem no repo, etc.). O build de produção **foi** executado neste deploy; a secção P13 do suite continua em WARN até se definir `IMPETUS_FINAL_READINESS_RUN_BUILD=true` para integrar o build no próprio suite.

---

## 8. Validação de audiência e UX (Fases 7–8)

**Estado:** **pendente de validação manual** com credenciais reais.

Perfis indicados (operador, inspetor, coordenador, diretor, auditor) e regras de visibilidade contextual (produção não deve ver menu QUALITY completo, apenas widgets contextuais) **não** foram exercitados neste procedimento automatizado.

**Recomendação:** janela de observação 15–30 min após login por perfil; monitorizar logs de publicação, navegação, rollout e lazy loading conforme runbook interno.

---

## 9. Observabilidade de navegação (resumo)

- Rotas QUALITY respondem de forma consistente (401 sem sessão, sem 404/500 nos probes).
- Telemetria/cliente e métricas de publicação existentes no código mantêm-se **aditivas**; overhead deverá ser aferido em runtime com utilizadores reais.

---

## 10. Rollback imediato (Fase 9)

Ordem sugerida (sem migrations):

1. Restaurar `backend/.env` a partir de `env/backend.env` no backup.
2. Restaurar `frontend/.env.production` e remover ou reverter `frontend/.env` se necessário.
3. Se o `dist` anterior existir no backup: repor `frontend/dist/` a partir de `dist/frontend-dist-snapshot/`.
4. `pm2 reload impetus-backend --update-env`
5. `pm2 reload impetus-frontend --update-env`

---

## 11. GO / NO-GO

| Critério | Decisão |
|----------|---------|
| Rotas core e QUALITY sem 404/500 nos smokes | **GO** |
| Build frontend sem falha | **GO** |
| PM2 online pós-reload | **GO** |
| Testes `quality-publication-activation` | **GO** |
| Readiness enterprise | **GO WITH RESTRICTIONS** (rever avisos estáticos e validação manual P10/P13) |
| Audiência / menu / leaks | **NO-GO para “ampla produção”** até validação manual |

### Veredicto final

**GO condicionado:** deploy técnico de flags + artefacto + reload **concluído com sucesso**. **Ampliação de audiência** e confirmação de **ausência de leaks** exigem a bateria manual (Fases 7–8) e eventual observação prolongada.

---

## 12. Referências de ficheiros

- Log build: `backend/backups/quality-publication-activation-20260516T225757Z/reports/vite-build.log`
- Readiness: `backend/backups/quality-publication-activation-20260516T225757Z/reports/enterprise-final-readiness.log`
