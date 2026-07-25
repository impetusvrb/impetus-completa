# REG-001 — Recovery Plan

**Fonte:** `frontend/src/platform/audit/regression/reg001RecoveryPlan.js`  
**Regra:** reactivar antes de reescrever  
**Estado:** plano documentado — **correções NÃO aplicadas nesta fase de auditoria**

---

## Ordem obrigatória por correção

1. Verificar se a funcionalidade já existe  
2. Confirmar se apenas perdeu a ligação  
3. Restaurar a ligação existente  
4. Validar o funcionamento  
5. Só se não existir → nova demanda de desenvolvimento  

---

## Plano priorizado

| ID | Feature | Causa | Correção mínima | Risco | Prioridade |
|----|---------|-------|-----------------|------|------------|
| R1 | Mapa Vazamentos | route_not_mounted | Montar `/financial-leakage/*` → financialLeakageDetectorService | low | P1 |
| R2 | Mapa Industrial | route_not_mounted | Montar `/industrial/*` → industrialOperationalMapService | medium | P1 |
| R3 | Guard industrial | rbac_guard_mismatch | Unificar Layout ↔ App `canAccessIndustrialCore*` | medium | P1 |
| R4 | Centro Previsão | route_not_mounted | Completar forecasting mounts OU reduzir api.js | low–med | P2 |
| R5 | CenterWidget | dead_click | Mapear cerebro/insights em ROUTES | low | P3 |
| R6 | KPI /app/industrial | dead_click | Redirect → `/app/centro-operacoes-industrial` | low | P3 |

---

## Proibido em qualquer remediação

- Criar novos dashboards / engines / serviços
- Substituir implementações existentes
- Alterar OPM, CPL, EOX, WMS-REF, contratos certificados

---

## Validação sugerida pós-remediação (fase seguinte)

```bash
# Após R1–R3:
# - GET financial-leakage/map → 200
# - GET industrial/machines → 200
# - Diretor: menu e rota consistentes
# - npm run test:fin-aud001 (sem regressão audit)
# - npm run test:cpl-platform
# - npm run test:opm-logistics
```
