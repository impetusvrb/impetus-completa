# RESTART_SAFETY_AUDIT — Promoção controlada Motor A + camadas contextuais aditivas

**Data / hora (UTC):** 2026-05-10 (execução documentada nesta sessão)  
**Ambiente:** `/var/www/impetus-completa` — operacional  
**Princípio:** apenas reload + build; sem reset de BD, sem limpeza agressiva de cache, sem `replace` global de módulos contextuais.

---

## 1. Snapshot pré-operação (segurança)

| Item | Estado observado |
|------|------------------|
| **PM2** | `impetus-backend` (id 3), `impetus-frontend` (id 2), `lipsync-api` (id 1) — todos `online` antes do reload |
| **Backend** | Script: `backend/src/server.js`, CWD: `backend/`, porta de processo **4000** (LISTEN `*:4000`) |
| **Frontend** | `npm run preview:prod`, CWD: `frontend/`, porta **3000** (LISTEN `0.0.0.0:3000`) |
| **Proxy** | nginx **:80** |
| **PostgreSQL** | **127.0.0.1:5432** (LISTEN) |
| **Lipsync** | **0.0.0.0:5001** |
| **Memória** | ~7.8 Gi total, ~5.4 Gi available (snapshot) |
| **Disco /** | ~15% uso em `/` |
| **Build anterior** | `frontend/dist/index.html` com timestamp anterior ao novo build (registo em disco antes: 2026-05-10 13:28 UTC) |

**Nota:** Valores de `JWT_SECRET`, `OPENAI_API_KEY`, `DB_PASSWORD` e similares **não** constam neste ficheiro. O inventário de variáveis sensíveis deve permanecer só em `.env` / gestão de segredos.

---

## 2. Flags validadas (`.env` + defaults do código)

| Variável | Valor no `backend/.env` (se definido) | Interpretação |
|----------|----------------------------------------|---------------|
| `IMPETUS_CONTEXTUAL_MODULES` | **`enrich`** | **ACTIVO (enrich)** — união legacy ∪ módulos permitidos pelo orchestrator; **não** é `replace` |
| `IMPETUS_CONTEXTUAL_SYSTEM_ADMIN` | *(ausente)* | **ACTIVO por defeito** (`true` em código, salvo `false` explícito) |
| `IMPETUS_DASHBOARD_ENGINE_V2` | *(ausente)* | **OFF** (rotas tratam ausência / `off` como Motor A primário em JSON legado) |
| `IMPETUS_GOVERNANCE_ENABLED` | *(ausente)* | **ACTIVO por defeito** (`!== 'false'` no código das rotas que consultam esta flag) |

Confirmado explicitamente no repositório:

- **`IMPETUS_CONTEXTUAL_MODULES_LOG_LEVEL=normal`** (presente junto ao modo enrich).

**Regra cumprida:** não foi activado `replace` global para módulos contextuais.

---

## 3. Frontend — build controlado

- Comando: `npm run build` em `frontend/`
- Resultado: **sucesso** (Vite, 0 erros de compilação)
- Artefactos: `frontend/dist/` regenerado (chunks JS/CSS e `index.html` actualizados na mesma execução)

Validação estática implícita: grafo de imports resolvido pelo bundler; sem alteração de CSS de produto nesta fase (apenas assets gerados pelo build existente).

---

## 4. PM2 — reload controlado + `--update-env`

**Ficheiro `ecosystem.config.js`:** não presente na raiz do repo; processos PM2 foram geridos por nome.

Comandos executados:

```bash
pm2 reload impetus-backend --update-env
pm2 reload impetus-frontend --update-env
```

- **Tipo:** reload por aplicação (não `pm2 kill`, não delete da lista)
- **Sessões:** tokens JWT/sessões em BD não foram invalidados por esta operação; utilizadores podem manter tokens até expiração (comportamento normal Node reload)
- **Workers:** `lipsync-api` **não** foi tocado (menor blast radius)

Pós-reload: `impetus-backend` e `impetus-frontend` **online** com novos PID.

---

## 5. Cache e invalidação

- Não foi executada limpeza manual de caches de aplicação nem de `node_modules`/`.vite` de forma agressiva.
- Novas `env` passam a valer no processo após `--update-env`.
- Capabilities contextuais / `contextual_modules` passam a reflectir o estado actual no próximo `/api/dashboard/me` por utilizador.

---

## 6. Healthcheck pós-restart

| Endpoint / check | HTTP | Notas |
|------------------|------|--------|
| `GET http://127.0.0.1:4000/health` | **200** | Backend responde |
| `GET http://127.0.0.1:4000/api/dashboard/me` | **401** | Esperado sem `Authorization` — rota protegida |
| `GET http://127.0.0.1:3000/` | **200** | Preview estático do frontend |

**Validação manual recomendada (com token):**

- `GET /api/dashboard/me` — presença de `visible_modules`, opcionalmente `contextual_modules` / `contextual_modules_meta`, campo aditivo `contextual_capabilities` quando aplicável.
- Login + chat / websocket conforme playbook interno.

---

## 7. Teste de personas (checklist operacional)

Validação funcional **manual** após deploy (com contas reais ou de staging):

| Persona | Verificar |
|---------|-----------|
| **CEO** | Dashboard executivo, grid / LiveSurface, módulos executivos |
| **CFO** | Centro de Custos, Mapa de Vazamento, Centro de Previsão (via módulos contextuais + menu híbrido) |
| **Admin Sistema** | Governança, utilizadores, base estrutural, biblioteca técnica, configurações — **sem** exigir `role` texto “Diretor” se `company_role` for admin IMPETUS |
| **Supervisor** | Operacional coerente, sem módulos executivos indevidos |
| **Operador** | Sem acesso executivo/admin |

---

## 8. Observabilidade (logs a vigiar)

Após reload, monitorizar (sem alterar config):

- `[CONTEXTUAL_MODULES_*]` / diff meta em respostas
- `[GOVERNANCE_DASHBOARD]` / rotas governance
- `[HIERARCHY_DRIFT]` se houver divergência `users` vs `company_roles`
- `[COGNITIVE_*]` se governance/cognitive estiver activo
- Erros 403 inesperados em `/api/admin/*` após mudança de capability

Procurar: loops de redirect no frontend, duplicação de itens no sidebar, `fallback: true` frequente em `contextual_modules_meta`.

---

## 9. Rollback imediato (sem rebuild)

Ajustar **apenas** variáveis de ambiente e recarregar PM2:

```bash
# Desligar módulos contextuais (volta ao legado puro em visible_modules)
IMPETUS_CONTEXTUAL_MODULES=off

# Desligar admin contextual por cargo (mantém só role legacy admin)
IMPETUS_CONTEXTUAL_SYSTEM_ADMIN=false
```

Depois: `pm2 reload impetus-backend --update-env` (e frontend se necessário).

**Não** é obrigatório rebuild do frontend para estes dois flags.

---

## 10. Resultado esperado (confirmado na execução)

1. Sistema permanece servido pelos mesmos processos PM2, com reload controlado.  
2. Camadas aditivas activas: **enrich** contextual + admin contextual por defeito; **sem** `IMPETUS_DASHBOARD_ENGINE_V2` global activo no `.env`.  
3. Frontend reconstruído e servido pelo mesmo fluxo `preview:prod`.  
4. Health HTTP 200 em backend e frontend; `/dashboard/me` 401 sem credenciais (contrato correcto).  
5. Nenhuma alteração de contrato público forçada neste documento; apenas reload + build.

---

## Anexo — Rotas críticas (referência)

- API: `/health`, `/api/dashboard/me`, `/api/auth/*`, `/api/admin/*`, `/api/admin/learning/*`  
- Frontend: SPA sob PM2 `impetus-frontend` (porta 3000 local; produção pode estar atrás de nginx `:80`)
