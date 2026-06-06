# ENV_RECOVERY_DB_VALIDATION

**FASE:** ENV-RECOVERY-03 — Etapa 03-E  
**Data:** 2026-06-04  
**Momento:** **Antes** de `pm2 reload impetus-backend`

---

## Método

Carregamento via `dotenv` + módulo canónico:

- `require('dotenv').config({ path: backend/.env, override: true })`
- `require('./src/db/index.js')` → `db.query('SELECT 1 AS ok')`

Equivalente ao caminho de produção após reload (`.env` com `override: true` sobrescreve env PM2 injectado).

---

## Resultado

| Campo | Valor |
|-------|--------|
| **Conexão** | **OK** |
| **Query** | `SELECT 1` → `{"ok":1}` |
| **Erro** | Nenhum |
| **Latência** | ~114 ms |

---

## Decisão

**DB_VALIDATION_PASS** — Autorizado prosseguir para **03-F** (`pm2 reload impetus-backend --update-env`).

**Frontend:** não reiniciado (conforme instrução).
