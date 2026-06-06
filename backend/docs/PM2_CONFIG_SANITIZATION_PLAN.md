# PM2_CONFIG_SANITIZATION_PLAN

**FASE:** PM2-CONFIG-SANITIZATION-01 — Etapa 04  
**Data:** 2026-06-04

---

## Fonte canónica (Etapa 03)

**`backend/.env`** — classificação **`CANONICAL_CONFIGURATION_SOURCE`**

Validado em ENV-RECOVERY-03:

| Critério | Estado |
|----------|--------|
| `SELECT 1` | **OK** |
| Login probe | **401** (não 500) |
| Deep health | **`ready: true`** |

Não alterar `.env` nesta fase.

---

## Respostas do plano

### 1. Qual variável diverge?

**`DB_PASSWORD`** (única divergência material entre `.env` e PM2/dump).

### 2. Onde diverge?

| Local | Hash |
|-------|------|
| `backend/.env` | `02b874c2143de9b1` ✓ |
| PM2 runtime (`pm2_env`) | `873cb24a6e3fcbd7` ✗ |
| `~/.pm2/dump.pm2` (entrada activa) | `873cb24a6e3fcbd7` ✗ (+ variantes históricas no ficheiro) |

### 3. O que será alterado?

- **`pm2 set impetus-backend:DB_PASSWORD`** — valor lido de `backend/.env` (não documentado em claro).
- **`pm2 reload impetus-backend --update-env`**
- Após validação: **`pm2 save`** para regravar `dump.pm2` alinhado.

**Não alterar:** `backend/.env`, PostgreSQL, código, F47.5, F48, Truth flags.

### 4. Qual risco?

| Risco | Classificação |
|-------|---------------|
| Reload com env errado se `.env` corrompido | **LOW** (`.env` validado) |
| `pm2 save` gravar estado intermédio | **MEDIUM** — só executar após VERIFY |
| Interrupção breve API | **LOW** — reload único |

**Classificação global do plano:** **LOW**

### 5. Como reverter?

```bash
cp backend/backups/pm2-config-sanitization-01/dump.pm2 /root/.pm2/dump.pm2
pm2 resurrect
pm2 reload impetus-backend --update-env
```

(`backend/.env` mantém-se — rollback PM2 apenas.)

---

## Veredito Etapa 04

**PLAN_APPROVED** — Prosseguir aplicação (Etapa 05).
