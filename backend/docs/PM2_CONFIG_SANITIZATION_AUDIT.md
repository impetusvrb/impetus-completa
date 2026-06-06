# PM2_CONFIG_SANITIZATION_AUDIT

**FASE:** PM2-CONFIG-SANITIZATION-01 — Etapa 01  
**Data:** 2026-06-04  
**Referência:** `ENV_FORENSIC_02.md`, `ENV_RECOVERY_CERTIFICATION.md`

---

## Escopo

Comparação **sem segredos** — presença + hash SHA-256 (16 chars) + resultado `IGUAL` / `DIFERENTE`.

| Fonte | Path / origem |
|-------|----------------|
| **backend/.env** | `/var/www/impetus-completa/backend/.env` (restaurado ENV-RECOVERY-03) |
| **PM2 runtime** | `pm2 env 3` (`impetus-backend`) |
| **dump.pm2** | `~/.pm2/dump.pm2` (entrada `impetus-backend`) |

---

## Tabela obrigatória

| Variável | backend/.env | PM2 runtime | dump.pm2 | Resultado |
|----------|--------------|-------------|----------|-----------|
| `DB_HOST` | PRESENTE `12ca17b49af22894` | PRESENTE `12ca17b49af22894` | PRESENTE `12ca17b49af22894` | **IGUAL** |
| `DB_PORT` | PRESENTE `4aeb7ad6d5d37a04` | PRESENTE `4aeb7ad6d5d37a04` | PRESENTE `4aeb7ad6d5d37a04` | **IGUAL** |
| `DB_NAME` | PRESENTE `2bee169f15ff1fa2` | PRESENTE `2bee169f15ff1fa2` | PRESENTE `2bee169f15ff1fa2` | **IGUAL** |
| `DB_USER` | PRESENTE `a942b37ccfaf5a81` | PRESENTE `a942b37ccfaf5a81` | PRESENTE `a942b37ccfaf5a81` | **IGUAL** |
| **`DB_PASSWORD`** | PRESENTE **`02b874c2143de9b1`** | PRESENTE **`873cb24a6e3fcbd7`** | PRESENTE **`873cb24a6e3fcbd7`** | **DIFERENTE** |
| `DATABASE_URL` | AUSENTE | AUSENTE | AUSENTE | **AUSENTE_TODOS** |
| `PGHOST` | PRESENTE `49960de5880e8c68` | PRESENTE `49960de5880e8c68` | PRESENTE `49960de5880e8c68` | **IGUAL** |
| `PGPORT` | PRESENTE `4aeb7ad6d5d37a04` | PRESENTE `4aeb7ad6d5d37a04` | PRESENTE `4aeb7ad6d5d37a04` | **IGUAL** |
| `PGDATABASE` | PRESENTE `2bee169f15ff1fa2` | PRESENTE `2bee169f15ff1fa2` | PRESENTE `2bee169f15ff1fa2` | **IGUAL** |
| `PGUSER` | PRESENTE `a942b37ccfaf5a81` | PRESENTE `a942b37ccfaf5a81` | PRESENTE `a942b37ccfaf5a81` | **IGUAL** |
| `PGPASSWORD` | PRESENTE `02b874c2143de9b1` | PRESENTE `02b874c2143de9b1` | PRESENTE `02b874c2143de9b1` | **IGUAL** |

---

## Achados críticos

1. **`DB_PASSWORD` divergente** entre `.env` (canónico válido) e PM2/dump (variante inválida `873cb24a6e3fcbd7`).
2. **`dump.pm2` contém 2 hashes distintos** para `DB_PASSWORD`: `02b874c2143de9b1` (2×) e `873cb24a6e3fcbd7` (4×) — lixo histórico ENV-FORENSIC-02.
3. **`PGPASSWORD` já alinhado** ao `.env`; **`DB_PASSWORD` PM2** não — pool `db/index.js` usa **`DB_PASSWORD`**, não `PGPASSWORD`.
4. **Runtime actual operacional** graças a `dotenv` `override: true` após ENV-RECOVERY-03; **risco residual** em `pm2 save` / `resurrect` sem sanitização.

---

## Nota `DB_HOST` vs `PGHOST`

Hashes diferentes entre si (`12ca17…` vs `49960d…`) mas **IGUAIS** entre as três fontes por variável — não é alvo desta sanitização (paridade interna mantida).

---

## Veredito Etapa 01

**AUDIT_COMPLETE** — Divergência confirmada: **`DB_PASSWORD`** (PM2 + dump vs `.env`).
