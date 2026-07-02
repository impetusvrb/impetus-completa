# ADR-020 — IMPETUS_ADMIN_JWT_SECRET no Perfil Enterprise

**Status:** Aceite  
**Data:** 2026-07-01  
**Certificação:** CERT-ENTERPRISE-HOUSEKEEPING-01  
**Origem:** NC-V001 (CERT-ONPREM-VALIDATION-01)  
**Relacionado:** ADR-003, ADR-017, CERT-ONPREM-ARCHITECTURE-01 Parte 7

---

## Contexto

O `configValidator.js` e o script `update-precheck.js` exigem `IMPETUS_ADMIN_JWT_SECRET` em **todos** os arranques strict (sem `ALLOW_PARTIAL_ENV`).

Paralelamente, o contrato Enterprise já estabelece:

| Documento | Decisão |
|-----------|---------|
| ADR-003 | Portal IMPETUS Admin **removido da distribuição** Enterprise |
| ADR-017 | Enterprise: `IMPETUS_ADMIN_JWT_SECRET` **unset** |
| ARCHITECTURE-01 Parte 7 | **Não configurado** — portal admin desactivado |
| INFRA-01 Anexo A | Comentário: **NÃO configurar** em Enterprise |

A homologação (VALIDATION-01) registou **NC-V001** (Média): `update-precheck` falha quando a variável está ausente — comportamento **incompatível** com o perfil Enterprise documentado.

---

## Problema

Deve `IMPETUS_ADMIN_JWT_SECRET` ser obrigatório numa instalação Enterprise On-Premise?

---

## Decisão

**Não.** No perfil **Distribuição Enterprise On-Premise**, `IMPETUS_ADMIN_JWT_SECRET` é **dispensado** (opcional / ausente por design).

| Perfil | `IMPETUS_ADMIN_JWT_SECRET` |
|--------|----------------------------|
| Plataforma SaaS IMPETUS | **Obrigatório** (portal admin cross-tenant) |
| Enterprise On-Premise | **Não configurar** — validação strict **não deve exigir** |

### Detecção de perfil Enterprise (contrato)

Uma das condições abaixo identifica perfil Enterprise para validação:

1. `IMPETUS_HOME` definido (layout canónico), **ou**
2. `IMPETUS_DISTRIBUTION=enterprise` no `.env` (flag explícita futura)

### Comportamento esperado de `update-precheck` / `configValidator`

- **SaaS:** manter exigência de `IMPETUS_ADMIN_JWT_SECRET`
- **Enterprise:** **omitir** verificação desta variável; `JWT_SECRET` e base de dados permanecem obrigatórios

---

## Consequências

### Positivas

- Alinhamento com ADR-003 e ADR-017
- NC-V001 resolvida **conceptualmente** sem activar portal admin em Enterprise
- Homologação em staging não gera falso negativo de precheck

### Implementação

**Não implementada nesta certificação** (HOUSEKEEPING-01 — apenas decisão documental).

### Backlog (pós-engenharia v1)

| ID | Item | Escopo |
|----|------|--------|
| **BL-E01** | `configValidator.getStrictConfigErrors()` — saltar `IMPETUS_ADMIN_JWT_SECRET` se perfil Enterprise | `backend/src/config/configValidator.js` |
| **BL-E02** | Documentar `IMPETUS_DISTRIBUTION=enterprise` em `env.enterprise.example` (opcional) | template apenas |
| **BL-E03** | Encerrar NC-V001 na re-execução VALIDATION-01 após BL-E01 | homologação |

**Não abrir certificação corretiva** salvo se homologação em staging comprove falha funcional adicional.

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| Manter obrigatoriedade em Enterprise | Contradiz ADR-003/017; força secret inútil |
| Remover `configValidator` check globalmente | Quebra SaaS |
| Definir valor dummy em runbook | Mascara perfil; secret fantasma |

---

## Referências

- `backend/src/config/configValidator.js`
- `backend/scripts/enterprise/update-precheck.js`
- `CERT-ONPREM-VALIDATION-01.md` — NC-V001
- `CERT-ENTERPRISE-HOUSEKEEPING-01.md`
