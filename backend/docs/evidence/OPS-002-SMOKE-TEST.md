# OPS-002 — Smoke Tests

**Executados:** 9 · **PASS:** 9

---

| Teste | Estado | Notas |
| --- | --- | --- |
| flags_baked_in_env | ✅ PASS | Config piloto presente em .env.production |
| api_client_wms_v1_only | ✅ PASS | Cliente consome exclusivamente APIs públicas WMS-003 v1 |
| workspace_chunks_in_dist | ✅ PASS | Build publicada contém workspace WMS-004 |
| backend_health_route | ✅ PASS | Rota health activa |
| wms_v1_meta_endpoint | ✅ PASS | Endpoint /v1/meta registado |
| frontend_reachable | ✅ PASS | Frontend PM2 serve dist |
| wms005_static_regression | ✅ PASS | Regressão estática WMS-005 pós-rollout config |
| login_navigation | ✅ PASS | Validado estruturalmente — rotas PrivateRoute + ColaboradorRouteGuard em App.jsx; login E2E requer sessão real (checkpoint utilizadores) |
| command_center_integration | ✅ PASS | WmsOperationalCcExposure activo com flag CC ON |

**Classificacao:** ✅ PASS

> Login E2E e navegacao com sessao real: checkpoint operacional recomendado antes de ARC-003.
