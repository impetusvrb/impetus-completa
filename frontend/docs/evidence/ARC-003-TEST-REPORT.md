# ARC-003 — Test Report

**Data:** 2026-07-19  
**Ambiente:** `/var/www/impetus-completa/frontend`

---

## Novos testes ARC-003

```bash
npm run test:arc003-eox
```

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | EOX component library exists | ✅ |
| 2 | EOX phase is ARC-003 | ✅ |
| 3 | single EoxHeader — no duplicate domain headers | ✅ |
| 4 | breadcrumb IMPETUS > Domínio > Módulo (WMS) | ✅ |
| 5 | returns Centro Cognitivo + domain landing | ✅ |
| 6 | quality, safety, environment active in registry | ✅ |
| 7 | supply and finance future consumers | ✅ |
| 8 | domain nav layouts wired in App.jsx | ✅ |
| 9 | hub headers suppressed when EOX active | ✅ |
| 10 | ONX adapters preserved over EOX | ✅ |
| 11 | industrial module header suppressed via context | ✅ |
| 12 | EOX observability events defined | ✅ |
| 13 | logistics hub resolves view breadcrumb | ✅ |
| 14 | buildEoxNavigationConfig sets ARC-003 phase | ✅ |

**Total: 14 passed, 0 failed**

---

## Regressão certificada

| Suite | Comando | Resultado |
|-------|---------|-----------|
| NAV-002 | `npm run test:nav002` | ✅ 10/10 |
| NAV-002A | `npm run test:nav002a` | ✅ 8/8 |
| NAV-001 | `npm run test:nav001` | ✅ 9/9 |
| OPM-001A | `npm run test:opm001a` | ✅ 16/16 |
| OPM-001B | `npm run test:opm001b` | ✅ 10/10 |
| OPM-001C | `npm run test:opm001c` | ✅ 10/10 |
| Warehouse regression | `npm run test:warehouse-regression` | ✅ 3/3 |
| Build produção | `npm run build` | ✅ (30.79s) |

---

## Alterações em testes existentes (justificadas)

| Ficheiro | Alteração | Motivo |
|----------|-----------|--------|
| `nav002OperationalNavigationTests.mjs` | Verifica `EoxHeader` para Link/history.back | ONX header agora é adapter |
| `nav002OperationalNavigationTests.mjs` | quality/environment/safety `active: true` | ARC-003 activa domínios |
| `nav002OperationalNavigationTests.mjs` | `navPhase` = `ARC-003` | Fase EOX canónica |
| `nav002aNavigationUxTests.mjs` | Verifica `EoxModuleShell` para context | Shell ONX delega para EOX |

Comportamento funcional certificado preservado; asserções actualizadas para reflectir arquitectura EOX.

---

## Validações manuais recomendadas

- [ ] WMS: `/app/logistics/warehouses` — um header, breadcrumb clicável
- [ ] Qualidade: `/app/quality/operational` — sem header duplicado
- [ ] SST: `/app/safety/operational?view=governance` — breadcrumb com vista
- [ ] Ambiental: `/app/environment/operational?view=water` — breadcrumb com vista
- [ ] Retorno ← Centro Cognitivo → `/app`
- [ ] Retorno ← Domínio → landing `/app/{domain}/operational`
- [ ] RBAC: perfis NAV-001 continuam a ver apenas domínios autorizados
- [ ] Responsividade mobile (breakpoint 768px)

---

## Comando de regressão completa

```bash
cd frontend && \
  npm run test:arc003-eox && \
  npm run test:nav002 && \
  npm run test:nav002a && \
  npm run test:nav001 && \
  npm run test:opm001a && \
  npm run test:opm001b && \
  npm run test:opm001c && \
  npm run test:warehouse-regression && \
  npm run build
```

**Resultado global: PASS**
