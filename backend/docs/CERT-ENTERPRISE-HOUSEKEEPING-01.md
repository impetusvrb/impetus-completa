# CERT-ENTERPRISE-HOUSEKEEPING-01 — Encerramento da Engenharia Enterprise v1

**Tipo:** Housekeeping técnico (documental)  
**Prioridade:** Baixa  
**Data:** 2026-07-01  
**Status:** **CERTIFICADO**  
**Código alterado:** **Nenhum**

---

## Objetivo

Encerrar formalmente a fase de **engenharia** Enterprise v1 eliminando pendências de rastreabilidade identificadas pelo CERT-ENTERPRISE-CLOSURE-01.

---

## PARTE 1 — NC-V001 (decisão formal)

### Auditoria

| Artefacto | Comportamento actual |
|-----------|---------------------|
| `configValidator.js` | Exige `IMPETUS_ADMIN_JWT_SECRET` em strict mode |
| `update-precheck.js` | Delega a `validateConfigOrThrow()` |
| ADR-003 / ADR-017 / INFRA-01 | Enterprise **sem** portal admin → secret **não configurado** |

### Decisão (ADR-020)

**`IMPETUS_ADMIN_JWT_SECRET` é dispensado no perfil Enterprise On-Premise.**

- SaaS: permanece obrigatório  
- Enterprise: validação strict **não deve exigir** (backlog BL-E01)  
- **Nenhuma alteração de código** nesta certificação

Ver: [`adrs/ADR-020-enterprise-admin-jwt-optional.md`](./adrs/ADR-020-enterprise-admin-jwt-optional.md)

### Backlog

| ID | Descrição |
|----|-----------|
| BL-E01 | Ajustar `configValidator` para perfil Enterprise |
| BL-E02 | Flag `IMPETUS_DISTRIBUTION=enterprise` no template (opcional) |
| BL-E03 | Encerrar NC-V001 na re-execução VALIDATION-01 |

---

## PARTE 2 — FORENSICS (rastreabilidade)

Criado: [`CERT-ONPREM-FORENSICS-01.md`](./CERT-ONPREM-FORENSICS-01.md)

Consolida o laudo forense original (2026-06-30) sem alterar decisões arquitecturais subsequentes.

---

## PARTE 3 — Auditoria de rastreabilidade

| Verificação | Resultado |
|-------------|-----------|
| Todas as certificações Enterprise v1 com documento `.md` | ✅ (14 certs — ver `CERTIFICATIONS-INDEX.md`) |
| ADRs 001–020 indexados | ✅ (`adrs/INDEX.md`) |
| Roadmap INFRA-01 → ficheiros existentes | ✅ |
| FUNCTIONAL_MATRIX referências | ✅ actualizado |

---

## PARTE 4 — Encerramento engenharia v1

| Fase | Estado |
|------|--------|
| Engenharia produto Enterprise v1 | ✅ **ENCERRADA** |
| Homologação operacional (STAGING → ROLLBACK → VALIDATION → GOLIVE) | ⏳ Pendente |

Nova certificação técnica **somente** se homologação em staging revelar defeito real do produto.

---

## Artefactos criados

| Ficheiro |
|----------|
| `CERT-ONPREM-FORENSICS-01.md` |
| `adrs/ADR-020-enterprise-admin-jwt-optional.md` |
| `CERT-ENTERPRISE-HOUSEKEEPING-01.md` |
| `CERTIFICATIONS-INDEX.md` |
| `adrs/INDEX.md` |
| `evidence/housekeeping-01/HOUSEKEEPING-01-MANIFEST.json` |

## Artefactos modificados

| Ficheiro |
|----------|
| `FUNCTIONAL_MATRIX.md` |

---

**CERT-ENTERPRISE-HOUSEKEEPING-01: CERTIFICADO**
