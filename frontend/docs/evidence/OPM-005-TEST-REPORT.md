# OPM-005 — Test Report

**Data:** 2026-07-19

```bash
npm run test:opm005-shipping-operations   # 18 testes OPM-005
npm run test:opm004                      # regressão picking
npm run test:opm003                      # regressão receiving
npm run test:wms-ref001                  # regressão componentes
npm run test:opm002a                     # regressão inventário
npm run build                            # build produção
```

**Resultado:** 18/18 OPM-005 ✅ · regressão completa ✅ · build ✅

---

## Cobertura OPM-005

- Estrutura módulo + foundation hook
- ShippingModulePage operacional (não generic frame)
- Composição WMS-REF-001
- APIs WMS-003 (listShipping, dispatchShipping, createMovement)
- Mapeamento estados operacionais outbound
- KPIs, consolidação carga, docas saída
- Integração picking + inventário (movement issue)
- Observabilidade SHIPPING_*
- EOX phase OPM-005
- Matriz reutilização WMS-REF-001
- Módulos certificados inalterados
