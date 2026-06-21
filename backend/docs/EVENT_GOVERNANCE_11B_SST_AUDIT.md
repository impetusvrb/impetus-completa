# EVENT-GOVERNANCE-11B — Auditoria SST

**Data:** 2026-06-20  
**Objectivo:** mapear produtores SST antes da migração para Event Governance  
**Escopo:** distribuição de alertas/notificações apenas — CAT, investigações, APR/PT, treinamentos e indicadores inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Produtor central (novo) | `sstNotificationService.js` → `notify()` / `dispatchFromOperationalAlert()` |
| Roteamento operacional | `operationalAlertsService._dispatchOperationalAlert()` → classificador `isSstOperationalAlert()` |
| Entrega legada | `unifiedMessagingService.sendToUser()` + `notificationBridgeService.bridgeExecutiveMessage()` (nível 4) |
| Política Governance | `SST_LIFECYCLE` |
| Escalonamento | Níveis 1–4 (Supervisor → +SST → +Gestão → Executive Mode) |

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
Alertas operacionais (tipo safety/SST)
    ↓
operationalAlertsService._dispatchOperationalAlert()
    ↓ (antes EG-11B)
operationalAlertsGovernanceAdapter (EG-04)
    ↓
notificationBridge / NC

Domínio safety (routes/domains)
    ↓
Persistência + runtime cognitivo — SEM dispatch directo de notificação

Industrial backbone (safety.incident.reported)
    ↓
IOE/AIOI — fora do escopo EG-11B (sem alteração)
```

---

## Produtores identificados

| Serviço | Função | Papel EG-11B |
|---------|--------|--------------|
| `operationalAlertsService.js` | `_dispatchOperationalAlert()` | **Ponto de integração** — alertas classificados SST |
| `sstNotificationService.js` | `notify()`, `dispatchFromOperationalAlert()` | **Produtor central criado** — distribuição regulada |
| `sstGovernanceAdapter.js` | `dispatchSstNotification()` | Shadow / migrado / fallback |
| `notificationBridgeService.js` | `bridgeExecutiveMessage()` | Nível 4 — reutiliza Executive Mode |
| `unifiedMessagingService.js` | `sendToUser()` | NC, Dashboard, Chat, App |

**Fora de escopo EG-11B (sem alteração):**

| Área | Motivo |
|------|--------|
| `routes/safetyOperational.js` | Workflow operacional SST |
| `routes/safetyGovernance.js` | Governança SST / compliance |
| `domains/safety/*` | Runtime cognitivo — sem dispatch directo |
| CAT / investigações / APR / PT | Requisitos legais e workflow preservados |
| Indicadores SST (`kpi-safety`) | Cálculo — sem dispatch |
| Treinamentos SST | Gestão — sem alteração de expiração |

---

## Eventos → `SST_LIFECYCLE`

| Fase Governance | Tipo / padrões |
|-----------------|----------------|
| `SST_INCIDENT_CREATED` | incident_created, sst_incident_created |
| `SST_INCIDENT_CRITICAL` | critical, fatal, severidade crítica |
| `SST_NEAR_MISS` | near_miss, quase_acidente |
| `SST_ACCIDENT_REPORTED` | accident, acidente, cat |
| `SST_TRAINING_EXPIRED` | training_expired, treinamento_vencido |
| `SST_TRAINING_DUE` | training_due, treinamento_vencendo |
| `SST_AUDIT_DUE` | audit_due, auditoria_programada |
| `SST_AUDIT_OVERDUE` | audit_overdue, auditoria_atrasada |
| `SST_NON_COMPLIANCE` | non_compliance, nc_sst |
| `SST_EMERGENCY_EVENT` | emergency, emergencia, evacuacao |

---

## Escalonamento ocupacional

| Nível | Destinatários | Reutilização |
|-------|---------------|--------------|
| 1 | Supervisores (`hierarchy_level <= 3`) | Base operacional |
| 2 | + Responsáveis SST (functional_area / role) | Padrão incidentes |
| 3 | + Gestão (`hierarchy_level <= 2`) | Acidentes, NC, auditorias atrasadas |
| 4 | + Executive Mode via `bridgeExecutiveMessage` | Crítico / emergência |

> Conceito de escalonamento introduzido para reutilização futura em **EG-11C (ESG)** e **EG-12 (AIOI)**.

---

## Destinatários legados

| Papel | Resolução |
|-------|-----------|
| Supervisor | `users.hierarchy_level <= 3` |
| SST Officer | `functional_area IN (safety, sst, ehs)` ou role/job_title |
| Gestão | `hierarchy_level <= 2` |
| Executive | `findSupervisorNcRecipients` + `bridgeExecutiveMessage` |

---

## Classificador operacional (`isSstOperationalAlert`)

Alertas roteados para SST quando:

- `tipo_alerta` começa com `sst_` ou `safety_`
- `source` contém safety/sst/seguranca
- Padrões: incident, near_miss, acidente, emergency, apr, pt_, loto, epi, cat, evacu
- Título contém sst/seguranca/acidente/emergencia

---

## Canais de distribuição

| Canal | Implementação |
|-------|---------------|
| Notification Center | `unifiedMessagingService.sendToUser()` |
| Dashboard | Idem (tipo warning/critical) |
| Chat | Idem |
| App Impetus | Idem + bridge executivo nível 4 |

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Perda de alerta SST | Fallback legado em `_dispatchSstNotify()` e catch em adapter |
| Alteração acidental de workflow | Integração apenas em `_dispatchOperationalAlert()` |
| Divergência shadow (escalation) | `payload.escalationLevel` propagado ao `evaluateEvent()` |
| Executive Mode alterado | Apenas `bridgeExecutiveMessage()` existente — sem mudanças |

---

## Critério de migração segura

- ✅ Nenhuma tabela/migration/worker/cron criado
- ✅ Workflow SST intocado
- ✅ Ponto único de distribuição (`sstNotificationService`)
- ✅ Shadow + flag `EVENT_GOVERNANCE_SST=false` (default)
- ✅ Fallback garantido
