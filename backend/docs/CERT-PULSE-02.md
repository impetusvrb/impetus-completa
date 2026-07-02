# CERT-PULSE-02 — Evolução Arquitetural do Impetus Pulse → Pulse Cognitivo Organizacional

**Certificação:** CERT-PULSE-02  
**Data:** 2026-06-27  
**Princípio:** Implementação 100% aditiva — zero regressão no Pulse legado.

---

## 1. Objetivo

Transformar o Impetus Pulse de pesquisa periódica de percepção em **sensor cognitivo organizacional contínuo**, simétrico ao Gêmeo Digital Cognitivo (máquinas → pessoas), sem substituir campanhas, autoavaliação, supervisor cego, analytics ou relatórios existentes.

---

## 2. Arquitetura implementada

```
Eventos Humanos (TPM, Pró-Ação, Pulse, ponto, tarefas, SST…)
            │
            ▼
Camada de Percepção Organizacional     → perceptionLayer.js
            │
            ▼
Motor de Correlação Humana             → humanCorrelationEngine.js
            │
            ▼
Motor Cognitivo Organizacional         → cognitiveMotor.js
            │
            ▼
Pulse State Engine                     → stateEngine.js
            │
            ▼
Pulse Index (0–100)                    → indexCalculator.js
            │
            ▼
Índices agregados + Padrões            → aggregateIndexService.js, patternDetection.js
            │
            ▼
IA Cognitiva Organizacional            → organizationalAI.js
            │
            ▼
Alertas · Insights · Dashboard RH      → pulseCognitiveService.js, PulseCognitiveRh.jsx
```

### Simetria com Gêmeo Digital

| Gêmeo Digital (ativos) | Pulse Cognitivo (pessoas) |
|------------------------|---------------------------|
| Sensores / telemetria | Eventos humanos na plataforma |
| Percepção operacional | `buildOrganizationalPerception` |
| Correlação cross-domain | `correlateHumanSignals` |
| Entendimento / narrativa | `buildOrganizationalUnderstanding` |
| Estado da máquina | `inferOrganizationalState` |
| Dashboard manutenção | `/app/pulse-cognitive-rh` |

---

## 3. Novos serviços

| Arquivo | Responsabilidade |
|---------|------------------|
| `backend/src/services/pulseCognitive/perceptionLayer.js` | FASE 1 — consolida sinais de TPM, Pró-Ação, registros, ponto, tarefas, SST, Pulse |
| `backend/src/services/pulseCognitive/humanCorrelationEngine.js` | FASE 2 — correlação multi-sinal |
| `backend/src/services/pulseCognitive/indexCalculator.js` | FASE 4 — algoritmo Pulse Index |
| `backend/src/services/pulseCognitive/stateEngine.js` | FASE 3/10 — estado organizacional inferido |
| `backend/src/services/pulseCognitive/patternDetection.js` | FASE 6 — padrões por equipe/setor |
| `backend/src/services/pulseCognitive/cognitiveMotor.js` | Compreensão estruturada + insights governados |
| `backend/src/services/pulseCognitive/aggregateIndexService.js` | FASE 5 — índices equipe/setor/turno/supervisor/empresa |
| `backend/src/services/pulseCognitive/organizationalAI.js` | FASE 8 — IA assistiva (compreensão organizacional) |
| `backend/src/services/pulseCognitive/eventIngestion.js` | FASE 7/11 — ingestão silenciosa + reconciliação |
| `backend/src/services/pulseCognitive/hooks.js` | Hooks fire-and-forget no Pulse legado |
| `backend/src/services/pulseCognitive/pulseCognitiveService.js` | Facade API / dashboard |

---

## 4. Novas tabelas (`pulse_cognitive_migration.sql`)

| Tabela | Função |
|--------|--------|
| `pulse_cognitive_events` | Fila de eventos humanos |
| `pulse_cognitive_index` | Índice vivo por colaborador |
| `pulse_cognitive_index_history` | Histórico temporal |
| `pulse_cognitive_aggregate_index` | Índices por escopo |
| `pulse_cognitive_state` | Estado organizacional inferido |
| `pulse_cognitive_patterns` | Padrões detectados |
| `pulse_cognitive_insights` | Insights governados (HITL) |

**Migração:** `psql "$DATABASE_URL" -f backend/src/models/pulse_cognitive_migration.sql`

---

## 5. Algoritmo Pulse Index

**Escala:** 0–100 por dimensão; índice global = média ponderada.

| Dimensão | Peso | Fontes principais |
|----------|------|-------------------|
| Engajamento | 15% | TPM + Pró-Ação + registros + tarefas |
| Participação | 12% | Comunicações lidas + tarefas |
| Desenvolvimento | 10% | Propostas Pró-Ação |
| Colaboração | 10% | Sinergia (última autoavaliação) ou volume operacional |
| Aprendizado | 8% | Registros inteligentes + desenvolvimento |
| Estabilidade | 15% | Absenteísmo, atrasos, horas extras (ponto) |
| Integração | 10% | Tempo de empresa/função |
| Consistência | 10% | Variação vs período anterior |
| Evolução | 10% | Tendência vs histórico |

O índice **não substitui** `pulse_evaluations.fixed_scores`.

---

## 6. Estados organizacionais (inferidos — nunca manuais)

- `healthy_team` — Equipe saudável  
- `stable_team` — Equipe estável  
- `growing_team` — Equipe em crescimento  
- `overloaded_team` — Equipe sobrecarregada  
- `disengaged_team` — Equipe desengajada  
- `transforming_team` — Equipe em transformação  
- `at_risk_team` — Equipe em risco  

---

## 7. Novos endpoints (aditivos)

Montagem: `/api/pulse/cognitive`

| Método | Rota | Acesso |
|--------|------|--------|
| GET | `/meta` | Autenticado |
| GET | `/hr/dashboard` | RH |
| GET | `/hr/subject/:userId` | RH |
| POST | `/hr/comprehension` | RH (IA assistiva) |
| POST | `/hr/reconcile` | RH (varredura silenciosa) |
| POST | `/hr/events` | RH (ingestão manual de evento) |
| GET | `/me/index` | Colaborador (próprio índice assistivo) |

**Rotas legadas `/api/pulse/*` — inalteradas.**

---

## 8. Frontend aditivo

| Artefato | Descrição |
|----------|-----------|
| `/app/pulse-cognitive-rh` | Dashboard cognitivo RH |
| `PulseCognitiveRh.jsx` | KPIs, temporal, setores, padrões, insights |
| `pulseCognitive` em `api.js` | Cliente HTTP novo |
| Menu RH | Entrada "Pulse Cognitivo (RH)" |

**Preservado:** `/app/pulse-rh`, `/app/pulse-gestao`, `ImpetusPulseModal`, campanhas.

---

## 9. Eventos monitorados

`tpm_recorded`, `proacao_submitted`, `intelligent_registration`, `pulse_self_evaluation`, `pulse_supervisor_perception`, `training_completed`, `role_changed`, `sst_incident`, `reconciliation_scan`, entre outros (ver `constants.js`).

**Hooks ativos hoje (silenciosos):**
- Após `submitSelfEvaluation` / `submitSelfEvaluationForTeamMember`
- Após `submitSupervisorPerception`

**Reconciliação RH:** `POST /pulse/cognitive/hr/reconcile` varre colaboradores elegíveis.

**Flag:** `IMPETUS_PULSE_COGNITIVE=off` desativa hooks.

---

## 10. Governança (FASE 14)

Toda inferência inclui:
- `assistive_only: true`
- `human_in_the_loop: true`
- Evidências, indicadores, correlações, nível de confiança
- Sem rótulos definitivos sobre colaboradores
- Decisão permanece humana (LGPD)

---

## 11. Compatibilidade e correções aditivas

| Item | Status |
|------|--------|
| Pulse RH (`PulseRh.jsx`) | Intacto |
| Pulse Gestão | Intacto |
| Autoavaliação + feedback IA | Intacto + hook pós-submit |
| Supervisor cego | Intacto + hook pós-percepção |
| Campanhas | Intactas |
| Relatórios JSON/PDF | Intactos |
| `all_factory_operators` no trigger RH | **Corrigido** — parâmetro repassado na rota (bug pré-existente) |

---

## 12. Testes de regressão

```bash
cd backend && npm run test:pulse-cognitive-regression
```

Valida: carregamento de módulos, algoritmos, governança, exports do `pulseService` legado.

---

## 13. Diagrama de fluxo pós-CERT-PULSE-02

```
[Contínuo] Evento na plataforma → hook/eventIngestion → perception → correlation → index → state → aggregates
[Campanha] RH dispara ciclo → pulse_evaluations (legado) → colaborador responde → feedback IA → hook cognitivo
[RH] Pulse Cognitivo dashboard + Pulse RH analytics (complementares)
```

O Pulse **não termina** cognitivamente após a campanha: o índice e os estados continuam a evoluir com novos eventos.

---

## 14. Próximas extensões (fora deste escopo)

- Hooks em rotas TPM/Pró-Ação/qualidade/SST (ingestão automática por domínio)
- Scheduler de campanhas (`pulse_campaigns.next_run_at`)
- Ligação `/me/start` para perguntas LLM na autoavaliação
- Cockpit RH nativo (Z.26) consumindo `pulse_cognitive_aggregate_index`
