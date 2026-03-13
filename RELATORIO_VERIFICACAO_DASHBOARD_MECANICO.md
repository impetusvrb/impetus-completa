# Relatório de Verificação – Dashboard Mecânico (Especificação Manutenção)

**Data:** 2026-03-07  
**Objetivo:** Verificar se as especificações da camada operacional de manutenção foram implementadas no perfil mecânico.

---

## Resumo Executivo

| Status | Descrição |
|--------|-----------|
| ❌ **Parcial / incompleto** | Backend tem APIs e serviços, mas frontend não consome nem exibe os blocos. Migration do schema não existe. |
| ✅ **Mantido** | Dashboard atual do mecânico permanece inalterado (mesma estrutura do DashboardInteligente). |
| ⚠️ **Não integrado** | APIs de manutenção existem, mas o DashboardInteligente não as utiliza. |

---

## 1. Arquitetura Atual

- **DashboardMecanico** = **DashboardInteligente** (mesmo componente para todos os perfis)
- Perfil mecânico determinado por: `technician_maintenance`, `supervisor_maintenance`, `coordinator_maintenance`, `manager_maintenance` ou job_title contendo "mecânico", "eletricista", "eletromecânico"
- O layout exibido é genérico; não há blocos específicos para manutenção

---

## 2. Verificação por Item da Especificação

### 2.1 Cabeçalho Técnico Complementar

**Especificação:** Resumo do dia com OS abertas, preventivas, pendências, máquinas em atenção, chamados aguardando.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Implementado | `GET /api/dashboard/maintenance/summary` – `maintenanceDashboard.getTechnicalSummary()` retorna `frase_resumo` no formato esperado |
| Frontend | ❌ Não implementado | Nenhum componente consome essa rota ou exibe o cabeçalho técnico |

---

### 2.2 Novos Cards Técnicos

**Especificação:** Ordens abertas, preventivas, pendências, máquinas em atenção, intervenções concluídas, chamados aguardando, falhas recorrentes, peças utilizadas.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Implementado | `GET /api/dashboard/maintenance/cards` – `getTechnicalCards()` retorna todos os contadores |
| Frontend | ❌ Não implementado | API `dashboard.maintenance.getCards()` existe, mas nunca é usada no DashboardInteligente |

---

### 2.3 Bloco "Minhas Tarefas de Hoje"

**Especificação:** OS atribuídas, máquina, setor, prioridade, status, horário previsto, ações (abrir, iniciar, atualizar, concluir, pedir ajuda da IA).

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Implementado | `GET /api/dashboard/maintenance/my-tasks` – `getMyTasksToday()` |
| Frontend | ❌ Não implementado | Rota não é consumida; não há seção “Minhas Tarefas de Hoje” |

---

### 2.4 Bloco "Máquinas em Atenção"

**Especificação:** Equipamentos com falhas recorrentes, risco, preventiva vencida, criticidade elevada.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Implementado | `GET /api/dashboard/maintenance/machines-attention` – `getMachinesInAttention()` |
| Frontend | ❌ Não implementado | Bloco não existe no dashboard |

---

### 2.5 Bloco "IA Técnica IMPETUS"

**Especificação:** Campo “Descreva o problema, sintoma ou dúvida técnica” com placeholder específico e atalhos (Diagnosticar falha, Consultar histórico, Buscar manual, etc.).

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Parcial | Chat com prompt adaptado para perfil de manutenção (`MAINTENANCE_CONTEXT`) em `/api/dashboard/chat` |
| Frontend | ❌ Não implementado | Não há bloco dedicado no dashboard; CentralAIPanel é genérico e não tem foco em manutenção |

---

### 2.6 Bloco "Registro Técnico do Turno"

**Especificação:** Registrar o que fez, encontrou, trocou, pendências, máquinas em risco, peças em falta; botão “Registrar com IA”.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ❌ Não implementado | Sem rota específica para registro técnico do turno |
| Frontend | ❌ Não implementado | Bloco não existe |

---

### 2.7 Bloco "Últimas Intervenções"

**Especificação:** Máquina, ação, técnico, data/hora, status, pendência associada.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Implementado | `GET /api/dashboard/maintenance/interventions` – `getLastInterventions()` |
| Frontend | ❌ Não implementado | Rota não é consumida; bloco não existe |

---

### 2.8 Bloco "Preventivas do Dia"

**Especificação:** Máquina, tipo, horário, checklist, status, responsável; pendentes, vencidas, concluídas.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Implementado | `GET /api/dashboard/maintenance/preventives` – `getPreventivesToday()` |
| Frontend | ❌ Não implementado | Rota não é consumida; bloco não existe |

---

### 2.9 Bloco "Passagem de Turno"

**Especificação:** Pendências, máquinas em observação, OS abertas, testes pendentes, peças aguardando; IA pode resumir.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ❌ Não implementado | Sem rota ou serviço específico |
| Frontend | ❌ Não implementado | Bloco não existe |

---

### 2.10 Bloco "Manuais de Máquinas"

**Especificação:** Cadastrar, consultar e organizar manuais; vincular à máquina; IA usa como base técnica.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Parcial | Manuais em AdminSettings; `documentContext.searchCompanyManuals()` para chat; sem rota dedicada para mecânico |
| Frontend | ❌ Não implementado | Acesso via AdminSettings; não há bloco/atalho no dashboard do mecânico |

---

### 2.11 Bloco "Histórico do que foi feito"

**Especificação:** Registro estruturado de intervenções (máquina, falha, causa, ação, peças, resultado) para memória operacional reutilizável pela IA.

| Camada | Status | Detalhes |
|--------|--------|----------|
| Backend | ✅ Parcial | `technical_interventions` usado em `getLastInterventions()`; não há endpoint específico para consulta estruturada pela IA |
| Frontend | ❌ Não implementado | Bloco não existe |

---

## 3. Schema e Migration

| Item | Status | Detalhes |
|------|--------|----------|
| `maintenance_operational_migration.sql` | ❌ **Não existe** | Referenciado em `run-all-migrations.js`, mas ausente em `backend/src/models/` |
| Tabelas esperadas | ⚠️ Provável ausência | `work_orders`, `maintenance_preventives`, `technical_interventions`, `monitored_points`, `equipment_failures` – não encontradas em outras migrations |

**Consequência:** As queries de `maintenanceDashboardService.js` tendem a falhar por falta dessas tabelas.

---

## 4. Comportamento da IA para Manutenção

| Item | Status | Detalhes |
|------|--------|----------|
| Prompt adaptado | ✅ Implementado | `MAINTENANCE_CONTEXT` no chat quando `isMaintenanceProfile(user)` |
| Foco técnico | ✅ Implementado | Diagnóstico de falhas, histórico, manuais, ordem de serviço, registro técnico |
| Bloco dedicado no dashboard | ❌ Não implementado | Não há entrada “IA Técnica” específica para o perfil mecânico |

---

## 5. Integração com o Dashboard Atual

| Regra | Status |
|-------|--------|
| Manter funcionalidades atuais | ✅ OK – estrutura existente preservada |
| Não remover módulos existentes | ✅ OK – nenhum bloco removido |
| Não quebrar estrutura | ✅ OK |
| Apenas complementar | ❌ Pendente – novos blocos não foram adicionados |
| Manter visual premium | ✅ OK |

---

## 6. Conclusão

### O que está implementado

1. **Backend:**
   - `maintenanceDashboardService.js` com lógica para summary, cards, my-tasks, machines-attention, interventions, preventives, recurring-failures
   - Rotas `/api/dashboard/maintenance/*` (summary, cards, my-tasks, machines-attention, interventions, preventives, recurring-failures)
   - Cliente de API no frontend `dashboard.maintenance.*`
   - Chat com prompt adaptado para perfil de manutenção (`MAINTENANCE_CONTEXT`)
   - Perfis e mapeamento de manutenção em `dashboardProfiles.js`

### O que não está implementado / conectado

1. **Frontend:** Nenhum dos blocos da especificação é exibido no DashboardInteligente. O perfil mecânico recebe o mesmo layout genérico.
2. **Migration:** `maintenance_operational_migration.sql` não existe; o schema necessário para manutenção não é criado.
3. **Blocos ausentes:**
   - Cabeçalho técnico complementar
   - Cards técnicos de manutenção
   - Minhas Tarefas de Hoje
   - Máquinas em Atenção
   - IA Técnica IMPETUS (bloco dedicado)
   - Registro Técnico do Turno
   - Últimas Intervenções
   - Preventivas do Dia
   - Passagem de Turno
   - Manuais de Máquinas (bloco/atalho no dashboard)
   - Histórico do que foi feito (bloco no dashboard)

### Veredicto

As especificações não foram executadas no dashboard do perfil mecânico. O backend possui a base (APIs e serviços), mas:

1. O frontend não consome essas APIs nem exibe os blocos descritos.
2. A migration necessária para criar as tabelas não existe.
3. Várias funcionalidades (Registro Técnico do Turno, Passagem de Turno) nem têm suporte no backend.

Para implementar a especificação completa serão necessários:

- Criação da migration `maintenance_operational_migration.sql` com as tabelas descritas.
- Alteração do `DashboardInteligente.jsx` (ou criação de componente específico) para, quando for perfil de manutenção:
  - Chamar as rotas `dashboard.maintenance.*`
  - Renderizar os blocos da especificação.
- Implementação das funcionalidades ainda inexistentes (Registro Técnico do Turno, Passagem de Turno, etc.) no backend e frontend.
