# GIT_AUDIT_COMMIT_7ea6cb2b8

**FASE:** GIT-AUDIT-01  
**Data:** 2026-06-04  
**Modo:** READ ONLY  
**Commit:** `7ea6cb2b8d23de4b57ffdf66261d5e9a4469dd11`  
**Autor:** wellington M.F  
**Mensagem:** `chore(git): reforçar .gitignore e remover do índice espelho legado e artefactos locais.`

---

## Resumo estatístico (`git show --stat`)

| Métrica | Valor |
|---------|-------|
| Ficheiros alterados | 188 |
| Inserções | +63 |
| Remoções (linhas no diff Git) | −40 268 |

---

## O que foi alterado (por categoria)

### 1. `.gitignore` (modificado — 1 ficheiro)

- Reforço de regras: `node_modules`, `deploy_backups`, `dist`, lab OPC-UA, `.env.edge-agent`, `__pycache__`, `vendor`, `admin-portal/dist`, etc.
- **Impacto em runtime:** nenhum (apenas metadados de versionamento).

### 2. `impetus_complete/**` (removido do **índice Git** — 186 paths)

Todos os paths com prefixo `impetus_complete/` aparecem como **D** no commit (deixaram de ser tracked). Incluem:

- Documentação: `INSTALACAO.md`, `LISTA_ARQUIVOS.txt`
- Espelho backend: `impetus_complete/backend/src/server.js`, rotas, serviços, middleware, models, socket, utils
- Espelho frontend: `impetus_complete/frontend/src/App.jsx`, páginas admin, `services/api.js`, `package-lock.json`

**Nota:** Operação equivalente a `git rm --cached` — remove do repositório remoto/local **histórico futuro**, não apaga obrigatoriamente o disco (a pasta `impetus_complete/` **permanece no servidor** — 433 MB verificados em auditoria).

### 3. `lipsync/__pycache__/lipsync_api.cpython-310.pyc` (1 ficheiro binário)

- Bytecode Python removido do índice.
- **Impacto em runtime Node/PM2:** nenhum.

---

## O que **não** foi alterado pelo commit

Verificação `git show 7ea6cb2b8 --name-only` filtrada:

- **Nenhum** ficheiro em `backend/src/` (árvore oficial).
- **Nenhum** ficheiro em `frontend/src/` (árvore oficial).
- **Nenhum** `package.json` / `package-lock.json` da raiz oficial.

---

## Conclusão do commit isolado

| Pergunta | Resposta |
|----------|----------|
| Removeu só artefatos/espelho? | **Sim** — 186/188 paths são `impetus_complete/` + 1 `.pyc` + `.gitignore`. |
| Alterou código PM2 oficial? | **Não** no conteúdo versionado desse commit. |
| Apagou ficheiros do disco? | **Não** via Git — apenas deixou de versionar `impetus_complete/` e o `.pyc`. |

**Classificação do commit `7ea6cb2b8`:** **SAFE** (escopo Git correto).
