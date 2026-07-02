# ADR-001 — Preservação do CompanyId

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Decisores:** Arquitetura IMPETUS Enterprise

---

## Contexto

O IMPETUS foi concebido como SaaS Multi-Tenant Híbrido. O identificador canónico de tenant é `companies.id`, exposto em runtime como `company_id` (JWT, queries) e alias `req.tenantId`. A auditoria forense (CERT-ONPREM-FORENSICS-01) confirmou que dezenas de módulos, migrations, guards de isolamento e contratos cognitivos dependem deste identificador.

Surge a questão: numa instalação Enterprise On-Premise de fábrica única, deve-se remover `company_id` para simplificar o modelo?

---

## Problema

Remover ou tornar opcional o `company_id` implicaria:

- Refactor de ~128 migrations e centenas de handlers
- Quebra do contrato Pulse (`eventIngestion.ingestHumanEvent(companyId, event)`)
- Invalidação do Event Backbone (outbox, throttle, archive por tenant)
- Perda de compatibilidade com RLS enterprise preparado
- Risco de regressão em RBAC, domínios operacionais e estado JSON em `backend/data/<uuid>/`

---

## Decisão

**Preservar `company_id` como identificador obrigatório e canónico** em todas as camadas (BD, JWT, middleware, serviços cognitivos, Event Backbone, frontend) na distribuição Enterprise On-Premise.

Cada instalação terá exactamente um registo activo em `companies`, mas o schema e os contratos permanecem inalterados.

---

## Consequências

### Positivas

- Zero reengenharia de schema ou middleware
- Paridade binária SaaS ↔ Enterprise (mesmo código, mesmas migrations)
- Pulse, Controller, Event Backbone e Gêmeo Digital permanecem intactos
- Roadmap multi-site futuro sem fork

### Negativas

- Instalações single-factory carregam abstração multi-tenant “dormida”
- Novos operadores devem compreender que `company_id` existe mesmo com uma empresa

### Neutras

- Documentação de instalação deve explicar criação do único registo `companies` no setup

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Remover coluna `company_id` das tabelas | Refactor massivo; alto risco de regressão |
| Tornar `company_id` nullable em Enterprise | Quebra guards fail-closed; inconsistência JWT |
| Substituir por `installation_id` global | Novo conceito; duplicaria função de `companies.id` |
| Hardcode UUID fixo em código | Anti-padrão; impede multi-site futuro |

---

## Referências

- `backend/src/middleware/tenantIsolationGuard.js`
- `backend/docs/PULSE_ARCHITECTURE_CONTRACT.md`
- CERT-ONPREM-FORENSICS-01, Parte 4
