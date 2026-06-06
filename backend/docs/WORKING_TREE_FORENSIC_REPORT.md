# WORKING_TREE_FORENSIC_REPORT

**FASE:** GIT-FORENSIC-02  
**Data da auditoria:** 2026-06-04  
**Modo:** READ ONLY ABSOLUTO  
**Commit analisado (contexto):** `7ea6cb2b8` — chore(git): .gitignore + limpeza de índice  
**HEAD / origin/main:** `7ea6cb2b8`

---

## 1. O que o Git reporta como estado `D`

`git status --short` classifica **214** entradas como apagadas no working tree (` D`), mais **2** modificados (` M`) e **41** untracked (`??`).

Os **195** paths em falta (intersecção `git ls-files` ∩ ausentes no disco em `backend/src` + `frontend/src`) são um subconjunto dos 214 — o restante inclui docs, `.cursor/rules`, `.env.example`, etc.

**Significado de `D`:** o ficheiro existe em **HEAD** (repositório Git íntegro), mas **não existe no disco** no path esperado. O Git **não** removeu o conteúdo do repositório; a remoção foi **física no filesystem**.

---

## 2. O que o commit `7ea6cb2b8` removeu (repositório)

| Categoria | Paths | Impacto no disco |
|-----------|-------|------------------|
| `.gitignore` | 1 (modificado) | Nenhum |
| `impetus_complete/**` | 186 | **Nenhum** — `git rm --cached` (índice apenas) |
| `lipsync/__pycache__/*.pyc` | 1 | **Nenhum** no runtime Node |

**Verificação:** `git show 7ea6cb2b8` e `7ea6cb2b8^` — `backend/src/server.js` tem **80 811 bytes** em **ambos** os commits. O push **não** apagou código oficial do repositório.

**Conclusão:** o commit **não é** a operação que apagou os 195 ficheiros do disco.

---

## 3. Linha temporal (evidências)

| Momento (UTC) | Evento | Evidência |
|---------------|--------|-----------|
| 2026-06-03 16:00 | Último commit que tocou `dashboard.js`, `App.jsx` | `git log -1 -- dashboard.js` → `1b8f4741b` |
| 2026-06-03 21:15 | Commit `c2fe109ff` (truth docs) | `git reflog` |
| 2026-06-03 22:54 | PM2 `impetus-backend` arrancou | `pm2 describe` → `created at` |
| **2026-06-04 02:08–02:09** | **Alteração em massa no filesystem** | `stat backend/src`, `frontend/src`, `routes/`, `services/` → `Modify` |
| 2026-06-04 13:44 | Commit + push `7ea6cb2b8` | `git reflog` |

**Janela provável da remoção física:** **2026-06-04 entre ~02:08 e ~02:09 UTC** (mtime das pastas `backend/src` e `frontend/src`).

**Intervalo entre PM2 start e mtime:** ~3h15m — o processo arrancou **com** `server.js` presente; a remoção ocorreu **depois** do arranque.

**Reflog Git em 2026-06-04:** apenas `commit` às 13:44 — **sem** `checkout`, `reset`, `clean` ou `restore` nesse dia.

---

## 4. Contagens disco vs Git

| Escopo | Disco (`find -type f`) | Git (`git ls-files`) | Em falta |
|--------|------------------------|----------------------|----------|
| `backend/src` + `frontend/src` | 4 121 | 4 316 | **195** |
| Só `backend/src` | 3 369 | 3 428 | ~59 implícito no total |

A árvore **não foi apagada por completo** — permanecem milhares de ficheiros `.js` em `backend/src` (ex.: `routes/actionRuntime.js`, `cognitiveCouncil.js`). A degradação é **selectiva** (195 paths concretos).

### Padrão dos 195 ausentes (top diretórios)

| Contagem | Prefixo |
|----------|---------|
| 84 | `frontend/src/features/` (CentroComando, cognitive ecosystem, smart panel, …) |
| 40 | `backend/src/services/` |
| 13 | `frontend/src/components/` |
| 10 | `frontend/src/pages/` |
| 4 | `backend/src/routes/` (`dashboard.js`, `anam.js`, `admin/structural.js`, `admin/users.js`) |
| 1 | `backend/src/server.js` |
| 1 | `frontend/src/App.jsx`, `main.jsx`, `vite.config.js`, … |

Alinhado a módulos **cognitivos, dashboard, voz, Anam, truth** — não a pastas inteiras do runtime industrial novo (actionRuntime, workflowEngine, etc. muitas vezes **permanecem** no disco).

---

## 5. Symlinks e estrutura

```
ls -lah backend backend/src frontend frontend/src
file backend/src → directory (não symlink)
readlink -f backend/src → /var/www/impetus-completa/backend/src
```

**Sem** substituição por link simbólico. Estrutura de diretórios oficial intacta; faltam **ficheiros pontuais**.

---

## 6. Cópias dos ficheiros ausentes

| Path | Existe? | Notas |
|------|---------|-------|
| `backend/src/server.js` | **Não** | Entrypoint PM2 |
| `impetus_complete/backend/src/server.js` | **Sim** | ~4,8 KB — **legado**, ≠ HEAD (80 811 B) |
| `deploy_backups/20260601_2259/backend/src/server.js` | **Sim** | **80 811 B** — coincide com HEAD |
| `impetus_complete/backend/src/routes/dashboard.js` | **Sim** | Cópia legado |
| `deploy_backups/20260601_2259/backend/src/routes/dashboard.js` | **Sim** | Alinhado à árvore oficial da data do backup |

Outros `server.js` encontrados: apenas `node_modules` e espelhos aninhados — **irrelevantes** para produção.

**Conclusão:** recuperação fiável = **`git checkout HEAD -- <paths>`** ou cópia desde `deploy_backups/20260601_2259/` (snapshot 2026-06-01). **Não** usar `impetus_complete/` como fonte de produção.

---

## 7. Histórico shell (`history` / `.bash_history`)

Não há entradas claras em **2026-06-04** para `git checkout`, `git clean`, `git restore` ou `rm -rf backend/src` no histórico disponível.

Histórico mostra sobretudo `git push`, `git add`, `git remote` (sessões anteriores).

**Limite:** histórico incompleto — **não exclui** operação via Cursor Agent, script, ou outro utilizador sem entrada em `.bash_history`.

---

## 8. PM2 vs código no disco

| Campo | Valor |
|-------|-------|
| status | online |
| uptime (amostra) | ~16h |
| script path | `/var/www/impetus-completa/backend/src/server.js` |
| created at | **2026-06-03T22:54:53Z** |
| Ficheiro no disco agora | **ausente** |

**Resposta:** o PM2 **está configurado** para código que **já não existe** no disco. O processo em execução carregou o módulo **na altura do arranque** (22:54 UTC 03/06); Node mantém o código em memória. **`pm2 reload` / restart falhará** até restaurar `server.js` (e dependências em falta).

`ls -l /proc/<pid>/exe` aponta para Node do Cursor Server — ambiente de execução do IDE, não invalida o script path configurado.

---

## 9. Hipótese causal (ordenada por plausibilidade)

### H1 — Remoção / sobrescrita no filesystem (~02:09 UTC 04/06) — **mais provável**

- mtime coerente em `backend/src`, `frontend/src`, `routes/`, `services/`
- Sem entrada correspondente no `git reflog`
- Padrão selectivo (195 ficheiros), não `git clean -fd` total
- Possíveis vectores: sincronização de workspace (nota de mudança de path Cursor: `file:///app/backend/server/...`), agente de ficheiros, cópia parcial, script de deploy manual

### H2 — Commit `7ea6cb2b8` — **descartada** para disco

- 11h depois dos mtime
- Só alterou índice Git de `impetus_complete/` + `.gitignore`

### H3 — `git checkout` / `reset` / `clean` em 04/06 — **improvável**

- Reflog não regista checkout/reset/clean nessa data

### H4 — `git rm --cached impetus_complete` — **sem efeito** nos 195 paths

- Paths oficiais não estão sob `impetus_complete/` no Git

---

## 10. Respostas finais

### Qual evento removeu os arquivos?

**Remoção física selectiva no filesystem**, não um commit Git. O indicador temporal mais forte é a atualização de mtime **2026-06-04 ~02:08–02:09 UTC**. O agente/script exacto **não foi identificado** de forma conclusiva no histórico shell disponível.

### Quando ocorreu?

Entre **2026-06-03 22:54** (PM2 ainda com `server.js` válido no arranque) e **2026-06-04 02:09** (mtime). Episódio mais provável: **04/06 ~02:09 UTC**.

### Os arquivos ainda existem em outra árvore?

| Fonte | Utilizável para restaurar oficial? |
|-------|-------------------------------------|
| **Git HEAD / origin/main** | **Sim** — fonte canónica |
| **deploy_backups/20260601_2259/** | **Sim** — backup 01/06, tamanhos coincidem com HEAD |
| **impetus_complete/** | **Não** para produção — espelho legado divergente |

### A restauração pode ser feita sem risco?

**Sim**, desde que:

1. Use **`git checkout HEAD -- backend/src frontend/src`** (ou paths da lista dos 195) — **não** misturar com `impetus_complete/`
2. **Não** faça `git reset --hard` sem backup do que está `M`/`??` local
3. Valide com `git diff` vazio nos paths restaurados
4. Só depois `pm2 reload` com validação `/health`

Risco baixo para o **repositório**; risco médio se sobrescrever os 2 ficheiros `M` locais sem revisão.

### O PM2 está executando código que não existe mais no disco?

**Sim.** Memória do processo iniciado em 03/06 22:54; ficheiro `server.js` e outros **195** paths **ausentes no disco** em 04/06. Restart = **CRITICAL** até restauração.

### Estratégia segura de recuperação

```text
1. READ ONLY confirmado — não executado neste relatório:
   git diff HEAD -- backend/src/server.js   # deve listar deleted
   comm -23 <(git ls-files backend/src frontend/src|sort) \
          <(find backend/src frontend/src -type f|sed 's|^\./||'|sort) \
          > /tmp/missing-official.txt

2. Backup opcional do working tree actual:
   tar -czf /tmp/wt-before-restore-$(date +%Y%m%d).tar.gz \
     backend/src/services/executiveMode.js \
     backend/src/services/impetusVoiceChatService.js

3. Restauração canónica (quando autorizado — FORA desta fase):
   git checkout HEAD -- backend/src frontend/src
   # ou lista explícita: xargs git checkout HEAD -- < /tmp/missing-official.txt

4. Verificação:
   test -f backend/src/server.js && wc -c backend/src/server.js  # esperado 80811
   git status --short | grep '^ D' | wc -l                        # deve cair

5. Reload controlado (quando autorizado):
   pm2 reload impetus-backend --update-env
   curl -sS http://127.0.0.1:4000/health
```

**Rollback do commit `7ea6cb2b8`:** **não necessário** — não restaura disco; só re-tracka `impetus_complete/` no Git.

---

## 11. Classificação final

| Dimensão | Nível |
|----------|--------|
| Repositório Git (`7ea6cb2b8` + `origin/main`) | **SAFE** |
| Push `7ea6cb2b8` | **SAFE** (remoto íntegro) |
| Working tree local (195 missing) | **CRITICAL** |
| PM2 sem restart pós-degradação | **WARNING** (online por uptime, frágil) |
| Causa identificada com certeza absoluta | **WARNING** (hora provável; operador exacto inconclusivo) |

---

## 12. Relatórios relacionados

- [GIT_AUDIT_COMMIT_7ea6cb2b8.md](./GIT_AUDIT_COMMIT_7ea6cb2b8.md)
- [CRITICAL_FILE_MISSING_AUDIT.md](./CRITICAL_FILE_MISSING_AUDIT.md)
- [SERVER_ENTRYPOINT_INTEGRITY.md](./SERVER_ENTRYPOINT_INTEGRITY.md)
- [PM2_RUNTIME_SOURCE_AUDIT.md](./PM2_RUNTIME_SOURCE_AUDIT.md)
