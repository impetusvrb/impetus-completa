# ADR-003 — Separação entre Plataforma SaaS e Distribuição Enterprise

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-002, ADR-009

---

## Contexto

O IMPETUS opera actualmente como plataforma SaaS com: onboarding público, portal IMPETUS Admin cross-tenant, billing Asaas/Stripe, subscription governance e licenciamento remoto. A versão Enterprise On-Premise deve servir fábricas auto-hospedadas sem dependência da operação SaaS IMPETUS.

---

## Problema

Como entregar Enterprise On-Premise sem:

- Remover código SaaS (perda de paridade e manutenção duplicada)?
- Expor funcionalidades comerciais inadequadas (billing, portal admin)?
- Criar confusão entre “plataforma IMPETUS” e “instalação cliente”?

---

## Decisão

Estabelecer **duas distribuições lógicas** sobre **um único codebase**:

### Plataforma SaaS (actual)

- Multi-tenant pleno
- Portal IMPETUS Admin activo
- Billing, subscription, Asaas, Nexus activos
- Hospedagem IMPETUS (VPS/cloud)

### Distribuição Enterprise On-Premise

| Componente | Decisão |
|------------|---------|
| Portal SaaS / onboarding público | **Desactivado** |
| Billing / Subscription | **Desactivado** |
| Asaas / Stripe / Nexus Billing | **Desactivado** |
| Portal IMPETUS Admin | **Removido da distribuição** |
| Administração global cross-tenant | **Removido da distribuição** |
| Core operacional + cognitivo | **Mantido** |
| Licenciamento | **Certificação própria** (ADR-009) |

**Mecanismo:** flags de ambiente, nginx (não expor rotas admin), runbook de instalação — **não remoção de código**.

---

## Consequências

### Positivas

- Um repositório, um pipeline de migrations
- SaaS continua operacional sem impacto
- Enterprise activa subset via configuração
- Rollback de decisões via flags

### Negativas

- Código SaaS permanece no bundle Enterprise (tamanho, superfície teórica)
- Requer disciplina no runbook para não activar billing acidentalmente

### Mitigações (INFRA-01)

- Template `.env.enterprise` com flags pré-desactivadas
- Nginx block `/api/impetus-admin`, `/api/admin-portal`, `/api/webhooks/asaas`
- Smoke test valida ausência de rotas SaaS

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Repositório fork Enterprise | Duplicação insustentável |
| Remover código SaaS do repo | Quebra SaaS actual; regressão |
| Feature flags compile-time | Dois builds; drift |
| Microserviço billing separado | Over-engineering; fora de scope |

---

## Referências

- `backend/src/server.js` (rotas impetus-admin, subscription, webhooks/asaas)
- CERT-ONPREM-FORENSICS-01, Parte 3 e 11
