# Fase S — Controlled Cognitive Runtime Activation — Implementação

## Objetivo

Activar o **runtime cognitivo enterprise em produção** de forma **controlada**, **tenant-safe**, **rollback-safe** e **shadow-first** — sem activação global automática, sem alterar UX/CSS, preservando E→R e audit trail.

---

## Arquitetura de rollout

```
Governance operator
        │
        ▼
/api/internal/controlled-activation
        │
        ├── productionActivationOrchestrator (status, E→R readiness)
        ├── channelActivationGovernance (KPI → summary → chat → boundary)
        ├── governedChannelActivation (manual execute + approved_by)
        ├── tenantSafeActivation + tenantRuntimeIsolation
        ├── runtimeActivationCoordinator
        │     ├── contextualDeliveryValidator
        │     ├── hierarchyDeliveryValidator
        │     ├── operationalTargetingValidator
        │     └── activationStabilizationEngine
        ├── productionActivationTelemetry
        └── safeProductionDeploy (backup, build verify, PM2 plan)
```

Integração shadow em `GET /dashboard/me` → bloco opcional `controlled_activation`.

---

## Fluxo de activação

1. Verificar `GET /readiness` (delivery + hierarchy + targeting + stabilization).  
2. Verificar `GET /channels` (`next_expected`).  
3. `POST /activate/:channel` com body `{ "execute": true, "approved_by": "email@empresa" }` apenas se readiness/stability OK.  
4. Definir env do canal (`IMPETUS_KPI_GOVERNANCE`, etc.) conforme resposta `env_flag`.  
5. `pm2 reload impetus-backend --update-env` (manual — **nunca** automático global).  
6. `GET /stability` e `GET /report` pós-reload.

Ordem obrigatória: **kpi → summary → chat → boundary**.

---

## Feature flags (S.10)

| Variável | Default |
|----------|---------|
| `IMPETUS_CONTROLLED_RUNTIME_ACTIVATION` | **off** |
| `IMPETUS_PRODUCTION_CHANNEL_GOVERNANCE` | **off** |
| `IMPETUS_RUNTIME_DELIVERY_VALIDATION` | **off** |
| `IMPETUS_RUNTIME_STABILIZATION_MONITOR` | **off** |
| `IMPETUS_CONTROLLED_ACTIVATION_OBSERVABILITY` | **on** |

---

## API interna

Base: `/api/internal/controlled-activation` (auth + governance ACL)

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/status` | Estado Phase S + flags + canais |
| GET | `/readiness` | Readiness E→R + coordenação |
| GET | `/channels` | Ordem, activados, próximo |
| GET | `/tenants?tenant_id=` | Supervisão tenant |
| GET | `/delivery` | Validação contextual/hierarquia |
| GET | `/stability` | Issues de estabilização |
| GET | `/report` | Status + telemetria + deploy dry-run |
| POST | `/activate/:channel` | Activar canal (governed) |
| POST | `/deactivate/:channel` | Desactivar canal (governed) |

---

## Tenant-safe rollout

- `tenantRuntimeIsolation` — estado por `tenant_id`  
- `tenantGovernanceProtection` — validação antes de activar  
- Rollback por tenant: `deactivate` + limpar env + reload PM2  
- Sem propagação cross-tenant automática  

---

## Validação de entrega (S.5)

| Validador | Valida |
|-----------|--------|
| `contextualDeliveryValidator` | Módulos / eixo / precisão |
| `hierarchyDeliveryValidator` | Banda hierárquica / denied |
| `operationalTargetingValidator` | Confiança contextual / conflitos |

Métricas telemetria: `contextual_delivery_accuracy`, `hierarchy_accuracy`, `module_delivery_accuracy`, `KPI_delivery_accuracy`, `summary_delivery_accuracy`, `runtime_activation_confidence`, `rollout_health`, `activation_stability`.

---

## Estratégia de estabilização (S.6)

`activationStabilizationEngine.detectActivationIssues` monitoriza:

- leakage  
- underdelivery  
- hierarchy / authority mismatch  
- interchannel divergence  
- delivery instability  

Enforcement só com `IMPETUS_RUNTIME_STABILIZATION_MONITOR=on`.

---

## Deploy seguro (S.9)

```bash
# Dry-run (recomendado)
npm run controlled-activation:deploy:dry

# Produção (requer confirmação ops)
npm run controlled-activation:deploy
```

Passos: backup → verificação `frontend/dist` → plano PM2 reload → health HTTP → validação governance.

---

## Testes

```bash
npm run test:controlled-runtime-activation
```

Snapshots: `backend/tests/controlled-runtime-activation/snapshots/` (executive, director, coordinator, supervisor, operator, hr, quality, environmental, safety, financial).

---

## Plano de rollout recomendado

| Semana | Acção |
|--------|--------|
| 1 | Observabilidade ON; monitorizar `/report` |
| 2 | Activar KPI (tenant piloto) + validar delivery |
| 3 | summary → chat (se stability ≥ 0.75) |
| 4 | boundary + revisão audit |

---

## Plano de rollback

1. `POST /deactivate/:channel` (ordem inversa)  
2. Flags S enforcement → `off`  
3. PM2 reload  
4. Restaurar backup de `safeProductionDeploy` se aplicável  

**Sem rollback automático** — decisão humana obrigatória.

---

## Relação com `productionRollout/`

- **Final C (`productionRollout/`)** — sequência legacy de promoção de canal.  
- **Phase S (`controlledActivation/`)** — camada E→R com validação, tenant isolation e API unificada.  

Coexistência additive; não desactivar shadow nem observabilidade das fases anteriores.
