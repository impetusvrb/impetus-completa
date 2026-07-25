# ARC-003A — Test Report

**Data:** 2026-07-19

---

## Novos testes ARC-003A

```bash
npm run test:arc003a
```

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | EoxDomainNavLayout forwards Outlet context | ✅ |
| 2 | All domain nav layouts use EoxDomainNavLayout | ✅ |
| 3 | WMS nav layout forwards outlet context | ✅ |
| 4 | Domain workspaces mount original composition roots | ✅ |
| 5 | Safety ptw/epi render governance hub | ✅ |
| 6 | Environment page remounts on view change | ✅ |
| 7 | EOX shell does not substitute domain layout | ✅ |
| 8 | useEoxHubHeaderVisible only suppresses h1 | ✅ |
| 9 | Quality status bar outside EOX shell | ✅ |
| 10 | Registry includes governance views | ✅ |

**Total: 10 passed, 0 failed**

---

## Regressão certificada (pós-correcção)

| Suite | Resultado |
|-------|-----------|
| ARC-003 EOX | ✅ 14/14 |
| NAV-002 | ✅ 10/10 |
| NAV-002A | ✅ 8/8 |
| NAV-001 | ✅ 9/9 |
| OPM-001A | ✅ 16/16 |
| OPM-001B | ✅ 10/10 |
| OPM-001C | ✅ 10/10 |
| Build | ✅ |

---

## Gap de cobertura identificado (ARC-003)

Os testes ARC-003 verificavam existência de ficheiros e resolvers, mas **não** simulavam:

- Propagação de `Outlet context` através de layouts aninhados
- Montagem condicional de hubs com `companyId`
- Preservação de widgets lazy por domínio

ARC-003A fecha este gap com asserções estáticas sobre o adapter pattern e composição roots.

---

## Validação visual manual recomendada

Antes de OPM-002A, confirmar em browser:

- [ ] `/app/quality/operational?view=governance` — SPC/NCR/CAPA visíveis
- [ ] `/app/safety/operational?view=governance` — Matriz GHE visível
- [ ] `/app/safety/operational?view=ptw` — Governança SST (não placeholder)
- [ ] `/app/environment/operational?view=water` — Formulários operacionais
- [ ] `/app/logistics/operational` — Painel OTIF/KPIs carregam
- [ ] `/app/logistics/warehouses` — OPM-001B/C intacto
- [ ] Nenhum "Sessão sem empresa" com login válido

---

## Comando regressão completa

```bash
cd frontend && \
  npm run test:arc003a && \
  npm run test:arc003-eox && \
  npm run test:nav002 && \
  npm run test:nav002a && \
  npm run test:nav001 && \
  npm run test:opm001a && \
  npm run test:opm001b && \
  npm run test:opm001c && \
  npm run build
```

**Resultado global: PASS**
