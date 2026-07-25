# NAV-001 — Context-Aware Domain Navigation

**Programa:** Presentation Navigation  
**Tipo:** Frontend Only (correcção de segregação por domínio)  
**Data:** 2026-07-19  
**Parecer:** COMPLETED

---

## test:nav001-domain-navigation

| Resultado | Exit |
| --- | --- |
| PASS | 0 |

```
> impetus-comunica-ia-frontend@1.0.0 test:nav001-domain-navigation
> node --experimental-vm-modules src/tests/nav001/nav001DomainNavigationTests.mjs

NAV-001 — Domain Navigation Tests

  ✓ Warehouse Manager: LOGÍSTICA ✔ QUALIDADE ✖
  ✓ Gerente Qualidade: QUALIDADE ✔ LOGÍSTICA ✖
  ✓ Coordenador Meio Ambiente: MEIO AMBIENTE ✔ LOGÍSTICA ✖
  ✓ Operador Produção: sem LOGÍSTICA / QUALIDADE operacionais
  ✓ Marketing: nenhum domínio operacional industrial
  ✓ Técnico Segurança: SEGURANÇA ✔ LOGÍSTICA ✖
  ✓ merge sidebar: Qualidade não recebe secção LOGÍSTICA
  ✓ buildPresentationNavigationSections resolves per domain (not merge all)
  ✓ CEO/diretor: suppressDomainSections bloqueia navegação operacional

9 passed, 0 failed
```
