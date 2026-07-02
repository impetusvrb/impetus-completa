# Matriz de Conformidade — Containerização Enterprise

**Certificação:** CERT-ONPREM-CONTAINER-01  
**Regra:** PM2 continua runtime oficial. Docker apenas empacota. Alteração de código = não conformidade.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Conforme — empacotamento sem alteração de runtime |
| ⚠️ | Desvio de empacotamento documentado (env/adaptador) — sem alteração de código |
| ❌ | Não conforme — exige alteração de código (NÃO implementar) |
| N/A | Fora do scope container |

---

## Componentes auditados (PARTE 1)

| Componente | Volume-ready | Script/path certificado | Conformidade Docker |
|------------|:------------:|-------------------------|:-------------------:|
| PM2 `ecosystem.config.js` | N/A | Raiz repo | ✅ Host inalterado; container usa adaptador `docker/ecosystem.*.container.cjs` |
| Backend `server.js` | N/A | `backend/src/server.js` | ✅ PM2 inicia mesmo script |
| Frontend `serveDist.cjs` | N/A | `npm run preview:prod` | ✅ PM2 inicia mesmo comando |
| Nginx | `logs/nginx/` | `infra/nginx/impetus.conf` | ✅ Adaptador `docker/nginx/impetus-enterprise.conf` |
| PostgreSQL | `database/pgdata/` | `DATABASE_URL` / `DB_*` | ✅ Volume dedicado |
| IMPETUS_HOME | `/opt/impetus` | `impetusHome.js` | ✅ Mount 1:1 |
| `config/.env` | `config/` | `loadEnv.js` | ✅ Fonte única |
| uploads | `uploads/` | `uploadPaths.js` | ✅ |
| data (cognitivo) | `data/` | stores JSON | ✅ |
| licenses | `licenses/` | LICENSE-01 | ✅ |
| certificates | `certificates/` | INFRA-01 | ✅ |
| backups | `backups/` | `backup-enterprise.js` | ✅ |
| logs/backend | `logs/backend/` | INFRA-01 | ✅ PM2 logs → path certificado |
| logs/frontend | `logs/frontend/` | INFRA-01 | ✅ |
| temp | `temp/` | `impetusHome.js` | ✅ |
| runtime | `runtime/` | PM2_HOME container | ✅ |
| bootstrap | — | `bootstrap-enterprise.js` | ✅ Reutilizado entrypoint |
| migrations | — | `run-all-migrations.js` | ✅ Reutilizado entrypoint |
| backup/restore | — | `backup-enterprise.js` | ✅ Exec via `docker compose exec` |
| verify/health | — | `verify-enterprise.js` | ✅ |
| license-admin | — | `license-admin.js` | ✅ |

---

## Desvios de empacotamento documentados (⚠️ — não são alterações de código)

| ID | Desvio | Motivo | Mitigação | Código alterado? |
|----|--------|--------|-----------|:----------------:|
| NC-C01 | `LISTEN_HOST=0.0.0.0` + `ALLOW_PUBLIC_BIND=true` no perfil Docker | Nginx está noutro container; `127.0.0.1` impediria proxy interno | Rede Docker privada; só nginx expõe portas | **Não** |
| NC-C02 | `SERVE_DIST_HOST=0.0.0.0` no perfil Docker | Idem — nginx → frontend cross-container | Rede interna apenas | **Não** |
| NC-C03 | `DB_HOST=postgres` vs `127.0.0.1` host | Hostname serviço compose | `config/.env` perfil Docker | **Não** |
| NC-C04 | `docker/ecosystem.*.container.cjs` | Paths `/app/backend`, logs em `IMPETUS_HOME/logs/` | `ecosystem.config.js` host **intocado** | **Não** |
| NC-C05 | PM2 em 2 containers vs 1 daemon host | Compose exige serviços separados | Cada container: `pm2-runtime` 1 app; mesmo PM2 | **Não** |
| NC-C06 | Lipsync não containerizado | Python/Wav2Lip fora scope empacotamento | PM2 host `ecosystem.lipsync.config.cjs` | **Não** |

---

## Não conformidades bloqueadas (❌ — não implementadas)

| ID | Componente | Problema hipotético | Acção tomada |
|----|------------|---------------------|--------------|
| — | *(nenhuma)* | Nenhuma alteração de código foi necessária | Empacotamento concluído via env + adaptadores Docker |

**Política:** Se surgir ❌ durante VALIDATION-01, parar, documentar, não corrigir automaticamente.

---

## Compatibilidade PM2 host (PARTE 12)

| Cenário | Regressão | Evidência |
|---------|:---------:|-----------|
| PM2 host actual (`ecosystem.config.js`) | **Proibida** | Ficheiro **não modificado** |
| Enterprise IMPETUS_HOME host | **Proibida** | Mesmos paths |
| Docker Enterprise | Adicional | Compose + PM2 Runtime |
| Migração PM2 → Docker | Suportada | Copiar `${IMPETUS_HOME}`; `docker compose up` |

---

## Critérios proibidos — verificação

| Proibido alterar | Alterado? |
|------------------|:---------:|
| Regras de negócio | ❌ Não |
| Arquitectura cognitiva | ❌ Não |
| Event Backbone | ❌ Não |
| Pulse / Controller / CCE | ❌ Não |
| ANAM / Gêmeo Digital | ❌ Não |
| RBAC / JWT | ❌ Não |
| Licenciamento | ❌ Não |
| APIs públicas | ❌ Não |
| `ecosystem.config.js` (host) | ❌ Não |

**Ficheiros de aplicação modificados nesta certificação:** apenas `backend/package.json` (+1 script smoke delegado a bash).
