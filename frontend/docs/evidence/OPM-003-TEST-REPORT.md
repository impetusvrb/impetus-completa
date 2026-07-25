# OPM-003 — Test Report

**Data:** 2026-07-19

---

## Suites

```bash
npm run test:opm003-receiving-operations   # certificação OPM-003
npm run test:wms-ref001                      # regressão WMS-REF-001 + OPM-002A
```

---

## Cobertura OPM-003

- Módulo receiving foundation (18+ ficheiros)
- ReceivingModulePage vs WmsStandaloneModuleFrame
- Componentes WMS-REF-001 certificados
- APIs WMS-003 (list/create/status/movements/locations)
- Estados ASN operacionais
- KPIs inbound + docas + SLA
- Painel docas
- Timeline eventos
- Pesquisa e filtros
- Observabilidade RECEIVING_*
- Contratos integração Qualidade/Inventário
- Integração inventário (createMovement receipt)
- Cadastro ASN (receivingAsnUtils + ReceivingAsnPanel)
- EOX breadcrumb OPM-003
- Matriz reutilização WMS-REF-001
- Regressão picking/shipping/transfer/inventory/warehouse

---

## Resultado esperado

**19/19** testes OPM-003 · **27/27** regressão WMS-REF-001
