# Arquivos arquivados — registo central

Este diretório (`backend/_archived/`) guarda **cópias deslocadas via Git** de código legado, para **rastreabilidade e reversão**, sem apagar histórico.

**Produção (PM2):** continua a usar apenas `backend/src/server.js` e a árvore activa em `backend/src/`. Nada aqui é carregado pelo runtime oficial.

---

## Lista

### `middlewares/internalAdmin.js`

- **Origem:** `impetus_complete/backend/src/middleware/internalAdmin.js`
- **Motivo:** Nenhum `require(...internalAdmin...)` encontrado no repositório; middleware nunca integrado.
- **Substituído por:** Padrões de autorização em `backend/src/middleware/auth.js` e rotas administrativas oficiais.
- **Data:** 2026-04-28

### `middlewares/license.js`

- **Origem:** `impetus_complete/backend/src/middleware/license.js`
- **Motivo:** Não referenciado por rotas ou outros middlewares; apenas dependia de `services/license.js` no legado.
- **Substituído por:** Estratégia de produto actual (billing, flags, políticas) no `backend/` oficial, conforme módulos existentes.
- **Data:** 2026-04-28

### `middlewares/tenantIsolation.js`

- **Origem:** `impetus_complete/backend/src/middleware/tenantIsolation.js`
- **Motivo:** Nenhum `require(...tenantIsolation...)` no código analisado.
- **Substituído por:** `backend/src/middleware/multiTenant.js` e fluxo oficial multi-empresa.
- **Data:** 2026-04-28

### `routes/aiOrchestrator.js`

- **Origem:** `impetus_complete/backend/src/routes/aiOrchestrator.js`
- **Motivo:** **Não montado** em `impetus_complete/backend/src/app.js` (sem `app.use` para este router). Evita duplicar superfície HTTP obsoleta face ao stack cognitivo oficial.
- **Substituído por:** `backend/src/ai/cognitiveOrchestrator.js`, serviços correlatos e rotas montadas em `backend/src/server.js` (ex.: `/api/cognitive-council`).
- **Importante:** `impetus_complete/.../services/aiOrchestratorService.js` **não foi movido** — ainda é `require` de `chatAIService.js` e `routes/dashboard.js` no legado.
- **Data:** 2026-04-28

---

## Reversão

```bash
# Exemplo — repor um ficheiro no legado (ajustar caminhos conforme necessário)
git mv backend/_archived/middlewares/internalAdmin.js impetus_complete/backend/src/middleware/internalAdmin.js
```

**Nota técnica:** após mover para `_archived/`, os `require()` relativos dentro destes ficheiros **deixam de resolver** como no legado. São artefactos de museu **até** serem recolocados na árvore original.

---

# Pendências identificadas {#pendências-identificadas}

## `userIdentification` (backend oficial)

- Falta implementar no `userIdentificationService.js` oficial (paridade com legado / frontend):
  - `verifyDailyAccess`
  - `seedRegisteredNamesFromUsers`
- Rotas preparadas em `backend/src/routes/userIdentification.js` cobrem apenas um **subconjunto** até esses métodos existirem.

## Observações

- Não altera o runtime do processo PM2 enquanto `server.js` não montar novas rotas.
- Útil para alinhar `IdentificationModal` e fluxo diário após extensão do serviço.

---

## Inventário “não movido” (resumo)

| Caminho | Motivo |
|---------|--------|
| `impetus_complete/backend/src/app.js` | **Em uso:** `require('./app')` em `impetus_complete/backend/src/server.js`. |
| `impetus_complete/backend/src/services/aiOrchestratorService.js` | **Em uso:** `dashboard.js`, `chatAIService.js` no legado. |
| `backend/src/services/aiOrchestrator.js` | **Não referenciado** por outros ficheiros no `backend/`, mas **dúvida** sobre uso dinâmico / futuro; **política: não mover**. |
| `backend/src/app.js` | **Inexistente** na árvore oficial (entry é `server.js`). |

---

*Documento gerado no âmbito da ETAPA 4 — arquivamento seguro.*
