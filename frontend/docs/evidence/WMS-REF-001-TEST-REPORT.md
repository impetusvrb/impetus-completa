# WMS-REF-001 — Test Report

**Data:** 2026-07-19

---

## Suites executadas

```bash
npm run test:wms-ref001-reference-components  # 11 testes certificação
npm run test:opm002a                          # 16 testes regressão OPM-002A
```

---

## Cobertura WMS-REF-001

- Registo de certificação (`WMS-REF-001`, certified=true)
- Catálogo 7 componentes
- Contratos completos (13 campos × 7 componentes)
- Ficheiros de implementação existentes
- Import path oficial (`presentation/wms-reference-components`)
- Matriz reutilização OPM-003 → OPM-007
- Política de reutilização obrigatória
- Compatibilidade EOX / grid / observabilidade / RBAC / flags
- Assinaturas de comportamento (regressão componentes)
- Eventos documentados em contratos

---

## Resultado

**27/27 testes passaram** (11 WMS-REF-001 + 16 OPM-002A)
