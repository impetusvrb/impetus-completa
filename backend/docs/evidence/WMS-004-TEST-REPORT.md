# WMS-004 — Test Report

| Script | Resultado |
|--------|-----------|
| `test:wms-workspace` | workspace, v1 client, modules, no mocks |
| `test:wms-navigation` | registry, App route, RBAC, CC |
| `test:wms-api` | regressão WMS-003 |
| `test:architecture-conformance` | regressão ARC-001 |

```bash
cd backend
npm run test:wms-workspace
npm run test:wms-navigation
npm run test:wms-api
```

---

*Data:* 2026-07-18
