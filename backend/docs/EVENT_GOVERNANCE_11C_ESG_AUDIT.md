# EVENT-GOVERNANCE-11C — Auditoria ESG

**Data:** 2026-06-20  
**Objectivo:** mapear produtores ESG antes da migração para Event Governance  
**Escopo:** distribuição de alertas/notificações apenas — emissões, resíduos, energia, água, carbono, compliance e indicadores inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Produtor central (novo) | `esgNotificationService.js` → `notify()` / `dispatchFromOperationalAlert()` |
| Roteamento operacional | `operationalAlertsService._dispatchOperationalAlert()` → `isEsgOperationalAlert()` |
| Entrega legada | `unifiedMessagingService.sendToUser()` + `bridgeExecutiveMessage()` (nível 4) |
| Política Governance | `ESG_LIFECYCLE` |
| Escalonamento | Níveis 1–4 (modelo SST reutilizado — escalonamento corporativo) |

```json
{
  "events_mapped": true,
  "notifications_identified": true,
  "migration_safe": true
}
```

---

## Arquitectura actual de distribuição (fragmentada)

```text
Alertas operacionais (tipo environment/esg)
    ↓
operationalAlertsService._dispatchOperationalAlert()
    ↓ (antes EG-11C)
operationalAlertsGovernanceAdapter (EG-04)
    ↓
notificationBridge / NC

Domínio environment (routes/domains)
    ↓
Persistência + runtime cognitivo — SEM dispatch directo de notificação

Industrial backbone (environment.* events)
    ↓
IOE/AIOI — fora do escopo EG-11C (sem alteração)

environmentalCognitiveService.adaptForCognitive()
    ↓
Gera alertas in-memory — sem dispatch NC directo
```

---

## Produtores identificados

| Serviço | Função | Papel EG-11C |
|---------|--------|--------------|
| `operationalAlertsService.js` | `_dispatchOperationalAlert()` | **Ponto de integração** — alertas classificados ESG |
| `esgNotificationService.js` | `notify()`, `dispatchFromOperationalAlert()` | **Produtor central criado** |
| `esgGovernanceAdapter.js` | `dispatchEsgNotification()` | Shadow / migrado / fallback |
| `notificationBridgeService.js` | `bridgeExecutiveMessage()` | Nível 4 — Executive Mode reutilizado |
| `unifiedMessagingService.js` | `sendToUser()` | NC, Dashboard, Chat, App |

**Fora de escopo EG-11C (sem alteração):**

| Área | Motivo |
|------|--------|
| `domains/environment/*` | Runtime operacional/cognitivo — sem dispatch directo |
| `environmentTelemetryIngestService` | Telemetria — sem alteração de thresholds |
| `environmentEsgGovernanceRuntime` | Score/readiness — sem dispatch |
| `environmentOperationalOrchestrator` | Workflow água/resíduos/emissões |
| Indicadores ESG / inventários | Cálculo e persistência inalterados |
| Auditorias ESG | Workflow preservado |

---

## Eventos → `ESG_LIFECYCLE`

| Fase Governance | Tipo / padrões |
|-----------------|----------------|
| `ESG_EMISSION_THRESHOLD` | emission, emissao, carbon, co2 |
| `ESG_WASTE_THRESHOLD` | waste, residuo, resíduo |
| `ESG_ENERGY_THRESHOLD` | energy, energia, consumo |
| `ESG_WATER_THRESHOLD` | water, agua, effluent, efluente |
| `ESG_COMPLIANCE_RISK` | compliance, conformidade, regulatory |
| `ESG_AUDIT_DUE` | audit_due, auditoria_programada |
| `ESG_AUDIT_OVERDUE` | audit_overdue, auditoria_atrasada |
| `ESG_SUSTAINABILITY_ALERT` | sustainability, esg_score, esg_alert |
| `ESG_ENVIRONMENTAL_INCIDENT` | environmental_incident, incident_opened |

---

## Escalonamento corporativo (modelo SST)

| Nível | Destinatários |
|-------|---------------|
| 1 | Supervisores (`hierarchy_level <= 3`) |
| 2 | + Responsáveis ESG (functional_area / role) |
| 3 | + Gestão (`hierarchy_level <= 2`) |
| 4 | + Executive Mode via `bridgeExecutiveMessage` |

---

## Destinatários legados

| Papel | Resolução |
|-------|-----------|
| Supervisor | `users.hierarchy_level <= 3` |
| ESG Officer | `functional_area IN (environment, esg, sustainability, ambiental, ehs)` |
| Gestão | `hierarchy_level <= 2` |
| Diretoria | `findSupervisorNcRecipients` + Executive bridge |

---

## Classificador operacional (`isEsgOperationalAlert`)

Alertas roteados para ESG **antes** de SST quando:

- `tipo_alerta` começa com `esg_`, `environment_`, `environmental_`
- `source` contém environment/esg/sustainability/ambiental
- Padrões: emission, waste, energy, water, carbon, esg, ambient, sustentabil
- Título contém esg/ambient/emiss/carbon/resíduo/sustentabil

> Ordem de roteamento: **ESG → SST → Operational (EG-04)** — evita colisão entre incidentes ambientais e SST.

---

## Canais de distribuição

| Canal | Implementação |
|-------|---------------|
| Notification Center | `unifiedMessagingService.sendToUser()` |
| Dashboard | Idem |
| Chat | Idem |
| App Impetus | Idem + bridge executivo nível 4 |
| Executive Mode | `bridgeExecutiveMessage()` (nível 4) |

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Perda de alerta ESG | Fallback legado em `_dispatchEsgNotify()` |
| Alteração de indicadores/compliance | Integração apenas em distribuição |
| Colisão ESG/SST | ESG classificado primeiro em `_dispatchOperationalAlert()` |
| Divergência shadow (escalation) | `payload.escalationLevel` em `evaluateEvent()` (EG-11B) |

---

## Preparação EG-12 (AIOI)

Com EG-11C, eventos ESG passam a orbitar o mesmo núcleo de governança que Quality, SST, TPM, Billing, DSR, etc. — preparando consumo normalizado pela AIOI sem integração domain-by-domain posterior.
