# ENV_RECOVERY_BACKUP_VALIDATION

**FASE:** ENV-RECOVERY-03 — Etapa 03-B  
**Data:** 2026-06-04  
**Modo:** Comparação por hash SHA-256 (prefixo 16 chars) — **sem exposição de segredos**

---

## Ficheiros comparados

| ID | Path |
|----|------|
| **R** | `backups/recovery_20260603_225426/backend.env` |
| **B** | `backend/.env.bkp.20260508_185602` |

---

## Campos DATABASE

| Campo | R (hash) | B (hash) | Equivalência |
|-------|----------|----------|--------------|
| `DB_HOST` | `12ca17b49af22894` | `12ca17b49af22894` | **IGUAL** |
| `DB_PORT` | `4aeb7ad6d5d37a04` | `4aeb7ad6d5d37a04` | **IGUAL** |
| `DB_NAME` | `2bee169f15ff1fa2` | `2bee169f15ff1fa2` | **IGUAL** |
| `DB_USER` | `a942b37ccfaf5a81` | `a942b37ccfaf5a81` | **IGUAL** |
| `DB_PASSWORD` | `02b874c2143de9b1` | `02b874c2143de9b1` | **IGUAL** |

**São equivalentes?** **Sim** — `EQUIVALENT_ALL_DB_FIELDS=IGUAL`.

---

## Teste `SELECT 1` (cliente Node/pg, credenciais carregadas do ficheiro)

| Fonte | Resultado | Latência |
|-------|-----------|----------|
| **R** (recovery 20260603) | **OK** (`1`) | ~547 ms |
| **B** (bkp 20260508) | **OK** (`1`) | ~121 ms |

Ambos passaram na auditoria forense anterior (`LOGIN_FORENSIC_01` / `ENV_FORENSIC_02`) e nesta revalidação.

---

## Fonte canónica para restore

| Decisão | Ficheiro |
|---------|----------|
| **Canónico** | `backups/recovery_20260603_225426/backend.env` |

**Motivos:**

1. Mais recente (2026-06-03 22:54 UTC, Truth Deploy `pm2 save`).
2. Inclui variáveis Truth/F47 além do núcleo DB (42 082 B vs 6 775 B do bkp antigo).
3. Paridade total de hashes DB_* com o bkp May 08.
4. `SELECT 1` **OK**.

O ficheiro `backend/.env.bkp.20260508_185602` serve apenas como **referência cruzada**, não como origem de restore.

---

## Veredito Etapa 03-B

**BACKUP_VALIDATION_PASS** — Prosseguir para backup preventivo (03-C) e restore com fonte **R**.
