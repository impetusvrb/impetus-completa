# ADR-008 — CompanyId como Partição Lógica

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-001, ADR-002, ADR-005

---

## Contexto

Em sistemas multi-tenant, `company_id` funciona como chave de particionamento lógica: isolamento de dados, throttle de eventos, estado cognitivo JSON, RLS PostgreSQL e RBAC modular. ADR-001 preserva o identificador; ADR-002 define single-tenant lógico com um registo activo.

---

## Problema

Qual o papel arquitectural de `company_id` em Enterprise quando existe apenas uma empresa? Deve ser tratado como legado ou como first-class citizen?

---

## Decisão

`company_id` permanece **partição lógica de first-class** em Enterprise:

| Camada | Função de `company_id` |
|--------|------------------------|
| PostgreSQL | Coluna FK em tabelas operacionais; RLS registry |
| JWT / Auth | Claim obrigatório; sessões scoped |
| Middleware | `tenantIsolationGuard` — anti-spoof activo |
| Event Backbone | Outbox envelope, throttle, archive, retention |
| Pulse | `eventIngestion.ingestHumanEvent(companyId, …)` |
| Filesystem | `data/<company_id>/` — estado cognitivo |
| Frontend | `localStorage.impetus_user.company_id` |

**Semântica Enterprise:** o UUID da única empresa activa é gerado no setup e **nunca** substituído durante vida da instalação (salvo DR completo).

---

## Consequências

### Positivas

- Consistência conceptual SaaS ↔ Enterprise
- Testes de isolamento permanecem válidos
- Expansão multi-company = adicionar registo + política, não refactor

### Negativas

- Queries sempre incluem `WHERE company_id = $1` (overhead negligível)

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Tratar `company_id` como deprecated em Enterprise | Confusão; risco de remover guards |
| UUID fixo universal hardcoded | Impede multi-site e DR |
| Particionamento por `installation_id` separado | Duplica `companies.id` |

---

## Referências

- `backend/src/middleware/tenantIsolationGuard.js`
- `backend/src/eventPipeline/partition/partitionKeyService.js`
- ADR-001, ADR-002
