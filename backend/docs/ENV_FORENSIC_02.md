# ENV-FORENSIC-02 — Auditoria Forense de Ambiente

**FASE:** ENV-FORENSIC-02  
**Modo:** READ ONLY absoluto  
**Data:** 2026-06-04  
**Objetivo:** Determinar a origem das variáveis PM2 do `impetus-backend` e por que, após GIT-RECOVERY-03, o runtime passou a usar credenciais PostgreSQL inválidas (erro `28P01`).

**Relacionado:** `LOGIN_FORENSIC_01.md`, `GIT_RECOVERY_PM2_VALIDATION.md`, `PM2_RECOVERY_BACKUP_REPORT.md`, `WORKING_TREE_FORENSIC_REPORT.md`.

---

## Resumo executivo

| Achado | Evidência |
|--------|-----------|
| **Fonte efectiva hoje** | Variáveis injectadas pelo **PM2** em `process.env` (persistidas em `~/.pm2/dump.pm2`) |
| **`backend/.env`** | **AUSENTE** no disco — `dotenv` em `db/index.js` não aplica override |
| **Divergência** | `DB_PASSWORD` no PM2 ≠ `DB_PASSWORD` em backups válidos (hash SHA-256 distinto) |
| **Momento da falha** | **2026-06-04 ~15:46:12 UTC** — primeiro `28P01` no log coincide com `created_at` pós `pm2 reload` GIT-RECOVERY-03 |
| **Antes do reload** | **0** ocorrências de `password authentication failed` em ~35 390 linhas de log |

---

## Etapa 1 — Inventário de fontes de configuração

| Fonte | Existe? | Última alteração (UTC) | Pode fornecer `DB_PASSWORD`? |
|-------|---------|------------------------|------------------------------|
| `backend/.env` | **Não** | — | **Sim** (quando existia) |
| `backend/.env.bkp.20260508_185602` | **Sim** | 2026-05-08 13:24 | **PRESENTE** |
| `backend/.env.edge-agent` | **Sim** | 2026-05-27 17:43 | **AUSENTE** (ficheiro lab/agente) |
| `backups/recovery_20260603_225426/backend.env` | **Sim** | 2026-06-03 22:54 | **PRESENTE** |
| `backups/*/backend/.env` (vários) | **Sim** | 2026-05-15 … 2026-05-20 | **PRESENTE** (padrão) |
| `deploy_backups/20260601_2259/.env` | **Sim** | 2026-06-01 12:48 | **PRESENTE** |
| `impetus_complete/backend/.env` | **Sim** (espelho legado) | não auditado em profundidade | Provável **PRESENTE** |
| `frontend/.env.production` | **Sim** | 2026-06-04 15:46 | **AUSENTE** (frontend) |
| `frontend/.env*` examples/bak | **Sim** | várias | **AUSENTE** |
| `ecosystem.config.js` / `ecosystem.production.js` | **Não** encontrados na raiz | — | — |
| `backend/ecosystem.industrial-lab.config.js` | **Sim** | 2026-05-27 | **AUSENTE** (só apps lab) |
| `ecosystem.lipsync.config.cjs` | **Sim** | 2026-06-04 02:08 | **AUSENTE** (lipsync-api) |
| `~/.pm2/dump.pm2` | **Sim** | 2026-06-03 22:54 | **PRESENTE** (2 variantes de hash) |
| `~/.pm2/module_conf.json` | **Sim** | 2026-03-03 | **AUSENTE** |
| `infra/*/docker-compose.yml` | **Sim** | — | **AUSENTE** (MQTT/Modbus lab) |
| `systemd` unit `impetus*` | **Não** encontrado | — | — |
| Scripts deploy (`backend/scripts/*deploy*`, `*pilot*`) | **Sim** | — | Indirecto (`pm2 restart --update-env`) |
| Shell exports / `env_file` PM2 | **AUSENTE** em `pm2 jlist` | — | — |

**Nota:** Não existe `ecosystem.config.js` canónico para `impetus-backend` no repositório; o processo foi registado no PM2 com **env inline** (tabela “Process configuration” + estado em `dump.pm2`).

---

## Etapa 2 — Auditoria PM2 (`impetus-backend`, id **3**)

### Metadados

| Campo | Valor |
|-------|--------|
| `script path` | `/var/www/impetus-completa/backend/src/server.js` |
| `exec cwd` | `/var/www/impetus-completa/backend` |
| `created at` (runtime actual) | **2026-06-04 15:46:12 UTC** |
| `env_file` (pm2 jlist) | **AUSENTE** |
| `dump.pm2` mtime | **2026-06-03 22:54:26 UTC** (`pm2 save` Truth Deploy) |

### Variáveis DATABASE no runtime (apenas presença)

| Variável | Estado |
|----------|--------|
| `DATABASE_URL` | **AUSENTE** |
| `DB_HOST` | **PRESENTE** |
| `DB_PORT` | **PRESENTE** |
| `DB_NAME` | **PRESENTE** |
| `DB_USER` | **PRESENTE** |
| `DB_PASSWORD` | **PRESENTE** |
| `PGHOST` | **PRESENTE** |
| `PGPORT` | **PRESENTE** |
| `PGDATABASE` | **PRESENTE** |
| `PGUSER` | **PRESENTE** |
| `PGPASSWORD` | **PRESENTE** |

### Conflitos internos PM2

| Par | Resultado |
|-----|-----------|
| `DB_PASSWORD` vs `PGPASSWORD` | **DIFERENTE** |
| `DB_HOST` vs `PGHOST` | **DIFERENTE** |
| `DB_NAME` vs `PGDATABASE` | **IGUAL** |
| `DB_USER` vs `PGUSER` | **IGUAL** |
| `DB_PORT` vs `PGPORT` | **IGUAL** |
| `DATABASE_URL` vs `DB_*` | **Sem conflito** (`DATABASE_URL` ausente) |

**Origem provável:** estado persistido em **`~/.pm2/dump.pm2`** (último `pm2 save` 2026-06-03 22:54) + reaplicação em **`pm2 reload --update-env`** (GIT-RECOVERY-03). O bloco `impetus-backend` em `dump.pm2` contém **`DB_PASSWORD` com 2 hashes distintos**; o runtime actual alinha-se ao hash com **4 ocorrências** no dump (variante **incorreta** para PostgreSQL).

**Pool efectivo:** `backend/src/db/index.js` usa ramo `DB_HOST` + `DB_PASSWORD` (não `DATABASE_URL`, não `PGPASSWORD`).

---

## Etapa 3 — Comparação backup válido vs PM2 runtime

Referência de backup alinhado com Truth Deploy:  
`backups/recovery_20260603_225426/backend.env` (igual em hash a `backend/.env.bkp.20260508_185602`).

Comparação por **hash SHA-256** (conteúdo não revelado):

| Campo | Backup válido | PM2 runtime | Resultado |
|-------|---------------|-------------|-----------|
| `DB_HOST` | PRESENTE | PRESENTE | **IGUAL** |
| `DB_PORT` | PRESENTE | PRESENTE | **IGUAL** |
| `DB_NAME` | PRESENTE | PRESENTE | **IGUAL** |
| `DB_USER` | PRESENTE | PRESENTE | **IGUAL** |
| `DB_PASSWORD` | PRESENTE | PRESENTE | **DIFERENTE** |
| `DATABASE_URL` | AUSENTE | AUSENTE | **Ausente em ambos** |

**Variantes em `dump.pm2`:**

| Hash (prefixo) | Ocorrências no dump | Match runtime PM2 | Validação PostgreSQL |
|----------------|---------------------|-------------------|----------------------|
| `02b874c2143d` | 2 | **DIFERENTE** | Alinhado a backups válidos (conexão OK em LOGIN_FORENSIC_01) |
| `873cb24a6e3f` | 4 | **IGUAL** | Falha `28P01` |

**Conclusão:** A credencial incorrecta **já estava no dump PM2** (variante majoritária); backups de `.env` tinham a variante **correcta**. O reload não inventou um password novo — **reaplicou a variante errada** persistida no PM2.

---

## Etapa 4 — Auditoria do pool PostgreSQL (`backend/src/db/index.js`)

```6:32:backend/src/db/index.js
require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });
// ...
const databaseUrl = (process.env.DATABASE_URL || '').trim();
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ...commonPool })
  : new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      // ...
      password: process.env.DB_PASSWORD,
```

### Ordem de precedência (arranque típico PM2)

| Prioridade | Fonte | Comportamento actual |
|------------|--------|----------------------|
| **1º** | **PM2 / `process.env` injectado** | Define `DB_*` antes do Node carregar módulos |
| **2º** | **`backend/.env`** via `dotenv` **`override: true`** | **Ignorado** — ficheiro **AUSENTE** |
| **3º** | **Defaults no código** | `host` 127.0.0.1, `database` impetus_db, `user` postgres — **password** sem default (fica o do PM2) |

**Se `backend/.env` existisse:** `.env` **sobrescreveria** PM2 (`override: true`) → backups válidos ganhariam.

**Qual fonte vence hoje?** **PM2 (`DB_PASSWORD` variante hash `873cb24a6e3f`)** — não há `.env` para corrigir no arranque.

---

## Etapa 5 — Linha do tempo

| Momento (UTC) | Evento | Confiança |
|---------------|--------|-----------|
| 2026-06-03 ~16:00–22:54 | Truth Deploy / certificação; `pm2 save` → `dump.pm2` | **ALTA** (docs + mtime dump) |
| 2026-06-03 **22:54** | `impetus-backend` arranca; `backend.env` copiado para `backups/recovery_*` | **ALTA** |
| 2026-06-03 22:54 → 2026-06-04 15:46 | Processo antigo online; **sem** `28P01` no log acumulado | **ALTA** (0 falhas antes linha 35391) |
| 2026-06-04 **02:08–02:09** | Remoção em massa no filesystem (`backend/src`, etc.) | **ALTA** (WORKING_TREE_FORENSIC) |
| 2026-06-04 02:08 → 15:46 | Processo **não** recarregado — BD provavelmente OK em memória / `.env` ainda existente no arranque | **MÉDIA** |
| 2026-06-04 **15:46:12** | GIT-RECOVERY-03: `pm2 reload impetus-backend --update-env` | **ALTA** |
| 2026-06-04 **15:46:12+** | Primeiro `password authentication failed` (linha log **35391**); `/api/system/health/deep` `DB_CONNECT` crítico | **ALTA** |
| 2026-06-04 15:46+ | Login → HTTP 500 *Erro interno no servidor* (`LOGIN_FORENSIC_01`) | **ALTA** |

**Momento em que o backend passou a usar credencial incorrecta:** **2026-06-04 ~15:46 UTC** — **ALTA CONFIANÇA** (correlação `created_at` PM2 = reload GIT-RECOVERY; estatística zero `28P01` antes dessa linha de arranque).

**Cadeia causal (ALTA CONFIANÇA):**

1. `dump.pm2` contém **duas** variantes de `DB_PASSWORD`; PM2/runtime usa a **errada**.
2. `backend/.env` **ausente** → `dotenv` não corrige.
3. `pm2 reload --update-env` reaplica env persistido → PostgreSQL rejeita → `28P01`.

**BAIXA CONFIANÇA:** Que o commit `7ea6cb2b8` ou o `git checkout` de `src/` tenham alterado passwords (não tocam `.env` versionado).

---

## Etapa 6 — Impacto operacional

Evidência runtime: `GET /health` → **200** (sem BD obrigatória); `GET /api/system/health/deep` → **200** com `ready: false` e `DB_CONNECT` crítico.

| Módulo | Classificação | Nota |
|--------|---------------|------|
| **Login** | **BLOQUEADO** | `auth.js` — query `users` falha `28P01` |
| **Users / RBAC** | **BLOQUEADO** | `middleware/auth.js`, rotas admin/users |
| **Dashboard** | **BLOQUEADO** | `routes/dashboard.js`, KPIs, charts |
| **Anam / Chat / Voz** | **BLOQUEADO** | serviços com `require('../db')` |
| **Truth / F47 enforcement** | **BLOQUEADO** | `industrialTruthEnforcementService`, boots schema |
| **Executive (F47.5)** | **BLOQUEADO** | `executiveMode.js` + BD |
| **Maintenance / TPM** | **BLOQUEADO** | rotas manutenção, reminders |
| **Workflow / Action runtime** | **BLOQUEADO** | persistência cognitiva/DB |
| **PLC / Edge ingest** | **BLOQUEADO** | logs `MODBUS_REAL_BOOT`, `EDGE_INGEST`, etc. |
| **Notifications** | **BLOQUEADO** | `reminderSchedulerService`, etc. |
| **HTTP superficial / estático** | **OK** | `/health` |
| **Processo PM2** | **DEGRADADO** | online mas sem BD; SLO burn nos logs |

**Código F47.5 / F48 no disco:** preservado pós GIT-RECOVERY (docs `GIT_RECOVERY_TRUTH_VALIDATION.md`) — risco é **runtime**, não perda de ficheiros.

---

## Etapa 7 — Plano de correção (NÃO EXECUTADO)

### OPÇÃO A — Restaurar `backend/.env`

| | |
|--|--|
| **Acção** | Copiar `backups/recovery_20260603_225426/backend.env` → `backend/.env` (ou backup May 08 equivalente em hash) |
| **Risco** | **Baixo** se origem for backup Truth Deploy; médio se `.env` tiver flags desactualizados |
| **Tempo** | Minutos |
| **Impacto** | `dotenv` `override: true` passa a **sobrescrever** env PM2 errado no próximo reload |
| **Rollback** | Remover `.env` + `pm2 reload` (volta ao estado actual — não recomendado) |

### OPÇÃO B — Corrigir PM2 runtime

| | |
|--|--|
| **Acção** | `pm2 set` / editar env do processo com `DB_PASSWORD` alinhado ao backup válido; `pm2 save`; `pm2 reload --update-env` |
| **Risco** | **Médio** — reintroduz duplicidade PM2 vs `.env`; `dump.pm2` pode voltar a guardar variante errada |
| **Tempo** | Minutos |
| **Impacto** | Imediato no reload sem ficheiro `.env` |
| **Rollback** | `pm2 resurrect` do `pm2_dump.pm2` em `backups/recovery_20260603_225426/` (cuidado: dump mistura 2 variantes) |

### OPÇÃO C — Fonte única de configuração

| | |
|--|--|
| **Acção** | Política: só `backend/.env` (ou secret manager); remover `DB_*` do env inline PM2; documentar `pm2 start` sem secrets no dump |
| **Risco** | **Baixo** a longo prazo; **médio** na migração |
| **Tempo** | 1–2 h (governança + validação) |
| **Impacto** | Elimina deriva PM2 vs disco |
| **Rollback** | Restaurar dump + `.env` de backup |

**Recomendação forense:** **OPÇÃO A** primeiro (backup 2026-06-03 já validado como hash igual ao `.env` funcional), seguida de **OPÇÃO C** para evitar repetição.

---

## Etapa 8 — Respostas obrigatórias

### 1. Qual é a fonte real das credenciais usadas pelo backend?

**PM2** — variáveis injectadas em `process.env` para o processo `impetus-backend` (persistidas em `~/.pm2/dump.pm2`), ramo `DB_HOST` / `DB_PASSWORD` / `DB_*`. Com `backend/.env` ausente, **não há override** por `dotenv`.

### 2. O PM2 está ignorando algum `.env`?

**Sim, de facto.** Não é que o PM2 leia `.env`; o Node em `db/index.js` tenta carregar `backend/.env` com `override: true`, mas o ficheiro está **AUSENTE**, logo prevalece o env **já injectado pelo PM2**.

### 3. Qual variável está divergente?

**`DB_PASSWORD`** — **DIFERENTE** entre PM2 runtime e backups válidos (`backend.env` recovery, `.env.bkp.20260508_*`, `deploy_backups/.../.env`). Demais `DB_*` comparados: **IGUAIS**. `DATABASE_URL`: **AUSENTE** em ambos.

### 4. Quando a divergência apareceu?

**Efeito operacional:** 2026-06-04 **~15:46 UTC** (pós `pm2 reload` GIT-RECOVERY-03) — **ALTA CONFIANÇA**.  
**Estado no dump:** variante errada já presente em `dump.pm2` de 2026-06-03 22:54 — **ALTA CONFIANÇA** (2 hashes; runtime usa o errado).

### 5. Qual correção é a mais segura?

**OPÇÃO A** — restaurar `backend/.env` a partir de `backups/recovery_20260603_225426/backend.env`, depois reload controlado (fora desta fase).

### 6. Existe risco para F47.5?

**Sim — runtime BLOQUEADO** (BD inacessível). Código local preservado; sem correção de env, `executiveMode` / voz não persistem/consultam BD.

### 7. Existe risco para F48?

**Sim — mesmo perfil** (serviços truth/operational com `require('../db')` **BLOQUEADOS**). Testes/scripts que exigem BD falham até env corrigido.

### 8. Existe risco para Truth Enforcement?

**Sim — BLOQUEADO** em runtime (`industrialTruthEnforcementService`, boots `AI_SCHEMA_BOOTSTRAP`, deep health não `ready`). Flags em env podem estar **PRESENTES** no backup, mas enforcement com persistência falha sem PostgreSQL.

### 9. Existe risco para PM2?

**WARNING → CRITICAL operacional:** processo **online** mas estado salvo (`dump.pm2`) contém **credencial errada**; `pm2 save` / `resurrect` pode perpetuar a variante inválida. **351+ restarts** históricos — não loop actual, mas reload com `--update-env` amplifica impacto.

### 10. Classificação final

| Veredito | **CRITICAL** |
|----------|----------------|
| Motivo | Desalinhamento documentado PM2 vs backups válidos; BD indisponível para toda a stack que usa `db/index.js`; disparado por reload pós-recovery sem `.env` |
| Componente SAFE | Inventário de ficheiros auth/db; backups íntegros; hash da password correcta identificável sem expor segredo |
| WARNING | Duplicidade `DB_*` vs `PG*` no PM2; dois hashes no dump |

---

## Veredito final

A credencial PostgreSQL incorrecta **não** provém de regressão de código no GIT-RECOVERY-03. Provém da **combinação**:

1. **`DB_PASSWORD` errada persistida no PM2** (`~/.pm2/dump.pm2`, variante hash `873cb24a6e3f`, 4× no dump).  
2. **`backend/.env` ausente**, impedindo `dotenv` de aplicar a password válida dos backups (hash `02b874c2143d`, alinhada a `recovery_20260603/backend.env`).  
3. **`pm2 reload impetus-backend --update-env`** em **2026-06-04 15:46 UTC**, que reaplicou o env PM2 e produziu o primeiro **`28P01`** na história do log analisado.

**CRITÉRIO DE SUCESSO:** Cumprido — origem identificada com evidência documental, **sem alteração** do ambiente.

---

*Gerado em ENV-FORENSIC-02 — READ ONLY. Nenhum ficheiro, PM2, Git ou PostgreSQL foi modificado.*
