# OPS-002 — Feature Flags (Pilot Activation)

**Modo:** configuracao operacional only  
**INC-048:** mantido OFF

---

| Flag | Esperado | Observado | Origem | Estado | Impacto |
| --- | --- | --- | --- | --- | --- |
| `VITE_IMPETUS_LOGISTICS_ENABLED` | true | true | frontend/.env.production | ✅ PASS | Capacidade WMS-004 activa |
| `VITE_IMPETUS_LOGISTICS_MENU` | true | true | frontend/.env.production | ✅ PASS | Capacidade WMS-004 activa |
| `VITE_IMPETUS_LOGISTICS_WORKSPACE` | true | true | frontend/.env.production | ✅ PASS | Capacidade WMS-004 activa |
| `VITE_IMPETUS_LOGISTICS_CC` | true | true | frontend/.env.production | ✅ PASS | Capacidade WMS-004 activa |
| `IMPETUS_INC048_ENABLED` | false | (absent → false) | backend/.env | ✅ PASS | INC-048 mantido desligado per OPS-002 |
| `IMPETUS_WMS_API_ENABLED` | true | true | backend/.env | ✅ PASS | Gate API WMS-003 — necessário para consumo v1 |
| `IMPETUS_LOGISTICS_ENABLED` | true | true | backend/.env | ✅ PASS | Mirror backend das flags piloto FE |
| `IMPETUS_LOGISTICS_MENU` | true | true | backend/.env | ✅ PASS | Mirror backend das flags piloto FE |
| `IMPETUS_LOGISTICS_WORKSPACE` | true | true | backend/.env | ✅ PASS | Mirror backend das flags piloto FE |
| `IMPETUS_LOGISTICS_CC` | true | true | backend/.env | ✅ PASS | Mirror backend das flags piloto FE |

**Todas flags WMS piloto ON:** YES  
**INC-048 OFF:** YES

**Classificacao:** ✅ PASS
