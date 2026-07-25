# APPSEC-02 — Relatório de Validação Red Team

**Decisão:** `APPSEC_CERTIFIED_WITH_REMARKS`  
**Security Improvement Score:** 80%  
**Regressões:** 0  
**Cenários:** 32 executados · 20/20 testes automatizados ✅

---

## Resumo executivo

A revalidação Red Team confirma que o **APPSEC-01 eliminou todas as vulnerabilidades P0/P1 exploráveis a nível de código** identificadas em 04/07/2026. Nenhuma regressão foi introduzida.

Itens **parcialmente mitigados** requerem acção **operacional** (não de código): remoção de backups `.env`, correcção de flags de produção, actualização de dependências npm.

---

## Vulnerabilidades eliminadas (FIXED)

| ID | Finding | Prioridade |
|----|---------|------------|
| RT-01 | IDOR Chat cross-tenant | P0 |
| RT-02 | SSRF Time Clock | P0 |
| RT-03 | SSRF PLC REST | P0 |
| RT-04 | Uploads legados chat/manuals | P1 |
| RT-06 | ACL uploads incompleta | P1 |
| RT-14 | MIME octet-stream bypass | P1 |

---

## Parcialmente mitigadas (PARTIALLY_FIXED)

| ID | Finding | Notas |
|----|---------|-------|
| RT-07 | Backups .env | Scanner activo; ficheiros ainda no disco — **ops** |
| RT-08 | Config produção | Validator no boot; `.env` ainda com flags inseguras — **ops** |
| RT-09 | npm audit | Governance activo; 9 High persistem — **deps upgrade** |
| RT-15 | Fallback chave Time Clock | Boot bloqueia em prod se ausente; fallback ainda no código |

---

## Fora de escopo APPSEC-01 (NOT_APPLICABLE)

RT-10 (JWT localStorage), RT-13 (RLS piloto), RT-16 (auth mount inconsistente)

---

## Regressões

**Nenhuma** — 10 checks de regressão de código passaram.

---

## Scores

| Métrica | Valor |
|---------|-------|
| Security Improvement Score | 80% |
| Vulnerability Reduction | 9 findings |
| Residual Risk | medium |
| P0/P1 failed | 0 |
| Scenario pass rate | ~79% |

---

## Próximo passo recomendado

**Red Team externo/independente** para confirmar P0/P1 em ambiente com backend activo e perspectiva diferente.
