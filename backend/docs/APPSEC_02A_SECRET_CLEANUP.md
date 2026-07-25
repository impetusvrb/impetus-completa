# APPSEC-02A — Secret Cleanup

**Componente:** `secretCleanupEngine.js`  
**Script:** `backend/scripts/security/cleanup-env-artifacts.sh`

---

## Objetivo

Inventariar automaticamente artefactos `.env` e backups históricos, classificar risco e produzir **plano de limpeza** — **sem remoção automática**.

---

## Inventário

Pastas analisadas:

- `backend/`
- `frontend/`

Padrões detectados:

- `.env` (ACTIVE)
- `.env.bak*`, `.env.backup*`, `.env.sec21*`, `.env.pre-*`, etc. (UNSAFE)
- Outros `.env.*` (BACKUP)
- `.env.example`, `.env.test` (ARCHIVED)

Cada entrada inclui: path, classificação, SHA256 prefix, tamanho, data modificação.

---

## Classificações

| Classe | Significado | Acção |
|--------|-------------|-------|
| ACTIVE | `.env` em uso | Manter; nunca arquivar sem migração |
| BACKUP | Cópias nomeadas | Rever; arquivar após rotação |
| ARCHIVED | Exemplos / dev | Baixo risco |
| UNSAFE | Backups com segredos expostos | Prioridade P0 — plano de remoção |

---

## Script oficial

```bash
# Simular (recomendado primeiro)
backend/scripts/security/cleanup-env-artifacts.sh --dry-run

# Aplicar após rotação de segredos
backend/scripts/security/cleanup-env-artifacts.sh --apply

# Consultar manifest para rollback manual
backend/scripts/security/cleanup-env-artifacts.sh --rollback
```

Artefactos arquivados em: `backend/.impetus-env-archive/`  
Manifest: `.impetus-env-archive/manifest.json`

---

## Relatório JSON

`docs/evidence/appsec-02a/secret-cleanup-report.json`

Campos: `summary`, `inventory`, `cleanup_plan`, `all_inventoried`, `ready_for_cleanup`

---

## RT-07

Finding Red Team RT-07 (backups `.env` no filesystem) permanece **PARTIALLY_FIXED** até `--apply` após rotação. O inventário garante que **nenhum backup fica sem plano de tratamento**.
