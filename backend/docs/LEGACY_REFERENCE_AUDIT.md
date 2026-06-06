# LEGACY_REFERENCE_AUDIT

**FASE:** GIT-AUDIT-01  
**Data:** 2026-06-04  
**Modo:** READ ONLY  
**Padrões pesquisados:** `impetus_complete/`, `backend (1)/`, `frontend (1)/`

---

## 1. `impetus_complete/`

### Código de produção (`backend/src/`, `frontend/src/`)

| Ficheiro | Tipo de referência |
|----------|-------------------|
| `backend/src/routes/audit.js` | Comentário — paridade com `impetus_complete/src/app.js` |
| `backend/src/services/googleTtsCore.js` | Comentário — menção histórica PM2 |
| `backend/src/services/machineMonitoringService.js` | Comentário — paridade legado |

**Nenhum** `require('...impetus_complete...')` ou import dinâmico para `impetus_complete/` no código oficial de `backend/src` ou `frontend/src`.

### Documentação e scripts (não executados em PM2)

Referências encontradas em:

- `docs/plano-unificacao-backends.md`, `docs/relatorio-comparativo-backends.md`, `docs/PLANO_*`
- `backend/_archived/**` (registry e ficheiros arquivados)
- `scripts/git-ignore-setup-and-cache-clean.sh` (manutenção Git)
- `.gitignore` (regra `impetus_complete/`)

**Risco de runtime:** referências são documentação, comentários ou tooling — **não** encadeamento de módulos Node em produção.

### Disco após commit

- `impetus_complete/` **existe** no servidor (~433 MB).
- `impetus_complete/backend/src/server.js` **existe** no disco.
- Deixou apenas de ser **versionado** no Git.

---

## 2. `backend (1)/` e `frontend (1)/`

| Local | Resultado |
|-------|-----------|
| `.gitignore` | Regras `**/backend (1)/`, `**/frontend (1)/` — pastas duplicadas Windows/cópia |
| Código `backend/src`, `frontend/src` | **Sem referências** |
| PM2 / package.json | **Sem referências** |

---

## Conclusão

| Pergunta | Resposta |
|----------|----------|
| Código actual depende de paths removidos do Git no commit? | **Não** — sem requires para `impetus_complete/`. |
| Remoção do índice quebra imports? | **Não** para árvore oficial PM2. |
| Pastas `(1)` relevantes? | Apenas ignoradas no `.gitignore`; não usadas em runtime. |

**Classificação:** **SAFE** (quanto ao commit `7ea6cb2b8` e referências de código).
