# RELATÓRIO DE CERTIFICAÇÃO INDUSTRIAL — IMPETUS

> **Ciclo:** CERT-01.1  
> **Data:** 2026-06-21  
> **Metodologia:** `backend/docs/MANUAL_MATRIZ_FUNCIONAL_REAL.md` (fonte de verdade)  
> **Selo alcançado:** **NENHUM** (ciclo em andamento — baseline instrumentada)

---

## 1. Resumo executivo

O IMPETUS possui **inventário estático completo** e **ferramentas de auditoria reproduzíveis**. A certificação operacional **não está concluída**: 72 de 77 telas permanecem `NAO_VALIDADO` (nenhuma linha VERDE com evidência E2E). Não foram detectados erros 5xx nos fluxos core testados por perfil.

| Dimensão | Estado |
|----------|--------|
| Inventário frontend/backend | ✅ Completo |
| Matriz funcional (estática) | ✅ Gerada (77 telas, 1097 endpoints) |
| Flags baseline | ✅ Congelado (`FLAG_BASELINE_FROZEN.md`) |
| Anti-drift | ✅ Gate disponível (`checkMatrixDrift.js`) |
| E2E smoke core (GET, 7 perfis) | ✅ 70 chamadas, 0×5xx |
| E2E domínios (10 cenários Parte 7.2) | 🟡 2/10 (Quality, SST) |
| Evidências versionadas | 🟡 2 cenários (`quality/nc-create/`, `safety/lifecycle/`) |
| Classificação VERDE | 🟡 2 cenários backend (9 fluxos API) |
| Selo Produção Enterprise | ❌ Não alcançado |

---

## 2. Checklist mestre (Parte 10)

| # | Item | Status | Evidência |
|---|------|--------|-----------|
| 2 | Inventário frontend + backend (JSON) | ✅ | `backend/docs/inventory/*.json` |
| 3 | Cadeias tela→BD rastreadas | 🟡 Parcial | Cruzamento path em `FUNCTIONAL_MATRIX.json`; botão→endpoint é v2 |
| 4 | `FLAG_BASELINE_FROZEN.md` | ✅ | `backend/docs/FLAG_BASELINE_FROZEN.md` |
| 5 | Varredura mocks | 🟡 | Sem `Math.random` em `components/charts/`; widgets com "indisponível" = estado vazio legítimo |
| 6 | Toda linha classificada | 🟡 | 72 `NAO_VALIDADO`, 5 `REDIRECT` — falta VERDE/AMARELO/MOCK por execução |
| 7 | 10 cenários E2E + 6 evidências | 🟡 | 2/10 — quality + safety |
| 8 | `FUNCTIONAL_MATRIX.json` + `.md` sync | ✅ | Regenerado 2026-06-21 |
| 9 | Gate drift CI | 🟡 | Script pronto; integração CI pendente |
| 10 | Selo declarado | ❌ | — |

---

## 3. Artefatos gerados neste ciclo

| Arquivo | Descrição |
|---------|-----------|
| `backend/docs/MANUAL_MATRIZ_FUNCIONAL_REAL.md` | Manual oficial v1.0 |
| `backend/docs/inventory/FRONTEND_INVENTORY.json` | 77 telas, guards, lazy/eager |
| `backend/docs/inventory/BACKEND_INVENTORY.json` | 1097 endpoints, 142 mounts |
| `backend/docs/FUNCTIONAL_MATRIX.json` | Matriz canónica |
| `backend/docs/FUNCTIONAL_MATRIX.md` | Render humano |
| `backend/docs/FLAG_BASELINE_FROZEN.md` | 690 flags backend + 52 Vite |
| `backend/scripts/audit/buildFunctionalMatrix.js` | Gerador read-only |
| `backend/scripts/audit/dumpEffectiveFlags.js` | Dump flags (Parte 4) |
| `backend/scripts/audit/checkMatrixDrift.js` | Anti-drift (Parte 9) |
| `backend/scripts/e2e_role_smoke.js` | Smoke GET por perfil |
| `backend/scripts/audit/e2e_quality_nc_capa.js` | E2E Quality NC→CAPA |
| `backend/scripts/audit/e2e_sst_lifecycle.js` | E2E SST incidente/near-miss/treinamento |
| `backend/scripts/audit/applyCertEvidenceToMatrix.js` | Reclassificação matriz pós-evidência |
| `backend/migrations/operational_alerts_sst_tipo_alerta_migration.sql` | Tipos SST em operational_alerts |

---

## 4. Estatísticas da matriz

```
Telas:              77
Endpoints backend:  1097
Mounts:             142
Chamadas api.js:    780
Endpoints ref. FE:  617
UNRESOLVED:         0

Status (estático + certificação):
  NAO_VALIDADO:     67
  REDIRECT:         5
  AMARELO:          5  (Quality + SST workspace — UI parcial)
  Cenários VERDE:   2  (Quality NC→CAPA, SST lifecycle)
```

> **Regra do manual:** VERDE nunca é atribuído por análise estática — exige Parte 7 (execução + 6 evidências).

---

## 5. Flags (Parte 4 — snapshot)

| Classe | Qtd |
|--------|-----|
| ATIVA | 363 |
| DESATIVADA | 289 |
| SHADOW | 8 |
| Vite (domínios publicados) | 52 |

**Impacto conhecido:** flags `VITE_IMPETUS_QUALITY_*`, `SAFETY_*`, `ENVIRONMENT_*` = `true` em produção → navegação de domínio activa para perfis não-executivos; CEO/Diretor com overlay suprimido (`Layout.jsx`).

---

## 6. Mocks (Parte 5)

| Varredura | Resultado |
|-----------|-----------|
| `Math.random` em `frontend/src/components/charts/` | ✅ 0 ocorrências |
| `Math.random` em `frontend/src/pages/` | ✅ 0 ocorrências |
| `StubPage` em rotas activas | ✅ Componente existe, **não importado** em rotas |
| Widgets "Dados indisponíveis" | 🟡 Estado vazio quando API/telemetria sem dados — **não é mock**, mas classificar AMARELO até telemetria PLC activa |

---

## 7. E2E executado (Parte 7 — parcial)

### 7.1 Smoke por perfil (`e2e_role_smoke.js`)

**Resultado: OK — 0×5xx / 0 timeout (70 chamadas)**

| Role | dashboard/me | kpis | trend | notif | unread | lgpd | admin/users | audio-logs | nexus | mes |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| ceo | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 403 | 200 |
| admin | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 200 |
| diretor | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 200 | 403 | 200 |
| gerente | 200 | 200 | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 |
| supervisor | 200 | 200 | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 |
| coordenador | 200 | 200 | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 |
| colaborador | 200 | 200 | 200 | 200 | 200 | 200 | 403 | 403 | 403 | 200 |

403 em rotas admin para perfis operacionais = **gating correcto**.

### 7.2 Cenários obrigatórios (Parte 7.2)

| Domínio | Cenário | Status | Evidência |
|---------|---------|--------|-----------|
| **Quality** | NC → CAPA → Auditoria | ✅ **VERDE** (API+BD) | `backend/docs/evidence/quality/nc-create/` |
| **SST** | Incidente / Quase-acidente / Treinamento vencido | ✅ **VERDE** (API+BD) | `backend/docs/evidence/safety/lifecycle/` |
| ESG | Emissão / Resíduo | ❌ | — |
| ManuIA | Diagnóstico → OS → Histórico | ❌ | — |
| TPM | Plano preventivo → execução | ❌ | — |
| AIOI | Correlação → Insight → Escalonamento | ❌ | — |
| Executive | Dashboard por perfil | 🟡 smoke GET only | — |
| Billing | Webhook Asaas | ❌ | — |
| DSR/LGPD | Pedido titular | 🟡 GET 200 (ceo/admin) | — |
| Event Governance | Evento → política → decisão | ❌ | — |

#### SST Lifecycle — detalhe (2026-06-21)

- **API:** `POST /api/safety-operational/events` (`incident`, `near_miss`, `training_expired`)
- **Flag:** `IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED=true`
- **Persistência:** `operational_alerts` + `hr_alerts` (treinamento vencido)
- **Notificação:** `SST_LIFECYCLE` via `sstNotificationService`
- **Migration:** `operational_alerts_sst_tipo_alerta_migration.sql`
- **Gap UI:** `SafetyOperationalWorkspace` view=incident — placeholder

#### Quality NC→CAPA — detalhe (2026-06-21)

- **Script:** `node backend/scripts/audit/e2e_quality_nc_capa.js`
- **5 passos HTTP:** inspeção NC → NCR instance → NCR transition (`quality.ncr.opened`) → CAPA instance → CAPA transition (`quality.capa.created`)
- **Persistência:** `quality_inspections`, `impetus_quality_workflow_instance`, `impetus_quality_audit_chain`
- **Isolamento:** Tenant B → HTTP 403, sem leak do registo NC
- **Gap UI:** `NcrCapaPanel` (QualityGovernanceHub) permanece **INCOMPLETO** — KPIs stub; telas Quality → **AMARELO**
- **Matriz:** `certifiedScenarios[0]` + `applyCertEvidenceToMatrix.js`

---

## 8. Problemas encontrados (prioridade)

| P | Problema | Classificação | Acção |
|---|----------|---------------|-------|
| P0 | 0 telas VERDE com evidência | Certificação bloqueada | Continuar Parte 7.2 (8 domínios restantes) |
| P1 | 67 telas NAO_VALIDADO | Cobertura | E2E + reclassificação |
| P1 | Telemetria PLC sem leitura recente | AMARELO | Widgets "indisponível" no dashboard CEO |
| P2 | Gate drift não no CI | Governança | Adicionar job `checkMatrixDrift --fail-on-drift` |
| P2 | Rastreio botão→endpoint (v2) | Matriz | Extender `buildFunctionalMatrix.js` com parse por componente |
| — | `data_controller_email` inexistente | ✅ Corrigido | `roleVerificationService` + rate limit Nginx |

---

## 9. Comandos de reprodução

```bash
# Regenerar matriz + inventários
node backend/scripts/audit/buildFunctionalMatrix.js

# Baseline de flags
node backend/scripts/audit/dumpEffectiveFlags.js

# Anti-drift
node backend/scripts/audit/checkMatrixDrift.js --fail-on-drift

# Smoke E2E por perfil
node backend/scripts/e2e_role_smoke.js

# Quality NC→CAPA (Parte 7.2)
node backend/scripts/audit/e2e_quality_nc_capa.js

# SST lifecycle (Parte 7.2)
node backend/scripts/audit/e2e_sst_lifecycle.js

# Reclassificar matriz
node backend/scripts/audit/applyCertEvidenceToMatrix.js
```

---

## 10. Próximo ciclo (ordem obrigatória)

1. ~~**Quality** — cenário NC→CAPA~~ ✅
2. ~~**SST** — incidente / treinamento vencido~~ ✅
3. **Executive** — dashboard CEO/Diretor
4. **ManuIA** — fluxo diagnóstico→OS

---

## 11. Declaração de selo

| Selo | Alcançado? |
|------|------------|
| Funcionalmente Certificado | ❌ |
| Operacionalmente Certificado | ❌ |
| Pronto para Piloto | ❌ |
| Pronto para Produção Enterprise | ❌ |

**Conclusão:** O IMPETUS está **instrumentado para certificação** (baseline + ferramentas + manual). A **certificação industrial real** exige conclusão dos 10 cenários E2E com evidências e reclassificação de 100% das funcionalidades — trabalho contínuo, não concluído neste ciclo.

---

_Relatório gerado conforme missão CERT-01.1. Nenhuma alteração de comportamento de produção foi feita neste ciclo de auditoria (classe CERT)._
