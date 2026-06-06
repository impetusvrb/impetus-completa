# AIOI_STRUCTURAL_READINESS

**Fase:** AIOI-GOVERNANCE-01 — Etapa 06  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código alterado  
**Objetivo:** Auditar prontidão estrutural do IMPETUS para suportar o AIOI  

---

## 1. Itens Auditados

### 1.1 Setores (`company_sectors`)

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| Tabela `company_sectors` | **READY** | FK `sector_id` no IOE e em `company_roles` | Nenhuma |
| Isolamento por `company_id` | **READY** | Multi-tenant seguro | Nenhuma |
| Referência no `organizationalIdentityEngine` | **READY** | `assertSectorBelongs()` valida FK | Nenhuma |
| FK de `company_roles → sector_id` | **READY** | Ownership de IOE via cargo → setor | Nenhuma |

**Veredito Setores:** `READY`

---

### 1.2 Cargos (`company_roles`)

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| Tabela `company_roles` | **READY** | FK `assigned_role_id` no IOE | Nenhuma |
| `hierarchy_level` (0–5) | **READY** | `priority_band` e escalonamento no IOE | Nenhuma |
| `department_id` FK | **READY** | Classificação de ownership | Nenhuma |
| `sector_id` FK | **READY** | Classificação de ownership | Nenhuma |
| `direct_superior_role_id` | **READY** | Cadeia de escalonamento | Nenhuma |
| `can_view_other_departments` | **READY** | Filtro de visibilidade na Queue API | Nenhuma |
| `internal_code` | **READY** | Identificação de cargo no audit trail | Nenhuma |
| `dashboard_functional_hint` | **READY** | Hint para audiência da fila executiva | Nenhuma |
| **Níveis 6–8 (Conselho/Investidor/Holding)** | **MISSING** | `audience_key = 'board'/'investor'` sem suporte | Reservar campos; não bloqueia P0 |

**Veredito Cargos:** `PARTIAL` (P0 OK; P2+ requer níveis 6–8)

---

### 1.3 Hierarchy Levels

| Nível | Label | Código | Estado |
|-------|-------|--------|--------|
| 0 | Presidência | PRES | **READY** |
| 1 | Diretoria | DIR | **READY** |
| 2 | Gerência | GER | **READY** |
| 3 | Coordenação | COORD | **READY** |
| 4 | Supervisão | SUP | **READY** |
| 5 | Operacional | OP | **READY** |
| 6 | Conselho | — | **MISSING** |
| 7 | Investidor | — | **MISSING** |
| 8 | Holding | — | **MISSING** |

**Impacto no AIOI P0:** Níveis 0–5 cobrem toda a hierarquia operacional necessária para P0.  
**Níveis 6–8:** Reservados via `audience_key` no IOE — não bloqueiam P0; exigem migration futura (P2+).

**Veredito Hierarchy:** `PARTIAL` (P0 READY; P2+ BLOCKED até migration)

---

### 1.4 RBAC

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| `moduleAccessGovernanceEngine` | **READY** | Controla acesso a módulos por `company_id` + role | Nenhuma |
| `roleAccessPolicy.js` | **READY** | Políticas por role no server | Nenhuma |
| `company_roles` como base RBAC | **READY** | IOE referencia via `assigned_role_id` | Nenhuma |
| `roleVerificationService.js` | **READY** | Verificação de permissão em runtime | Nenhuma |
| Filtro Queue API por `hierarchy_level` | **MISSING (a implementar)** | CEO vê fila nível 0; SUP vê nível 4 | Implementar na Queue API AIOI |
| Controle de `audience_key` por role | **MISSING (a implementar)** | Definir: quais roles veem `audience_key='ceo'` | Implementar na Queue API AIOI |
| `visibility_scope` enforcement | **MISSING (a implementar)** | Isolamento entre plantas/holdings | Reservado P2+ |

**Veredito RBAC:** `PARTIAL` (base READY; filtros de audience AIOI a implementar no P0)

---

### 1.5 Assets (`assets`)

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| Tabela `assets` | **READY** | Vinculação de IOE a ativos físicos | Nenhuma |
| FK `company_id` | **READY** | Multi-tenant seguro | Nenhuma |
| `model_3d_url` | **READY** | Evidência visual (P3+) | Nenhuma |
| Referência em `equipmentLibraryAdminService` | **READY** | Biblioteca técnica por asset | Nenhuma |
| FK `assets → machine_monitoring_config` | **PARTIAL** | IOE de equipamento referencia via `machine_identifier` | Verificar FK explícita em migration futura |

**Veredito Assets:** `PARTIAL` (base READY; FK explícita asset↔machine_monitoring precisa verificação)

---

### 1.6 Equipamentos / Máquinas

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| `machine_monitoring_config` | **READY** | Fonte primária de identidade de máquina para IOE | Nenhuma |
| `machineRepository.findMachinesByCompany()` | **READY** | Listagem por empresa com isolamento | Nenhuma |
| `machine_identifier` como chave | **READY** | Referência no `equipment_id` do IOE | Usar UUID de `machine_monitoring_config.id` |
| `line_name` | **READY** | Agrupamento por linha na fila executiva | Nenhuma |
| `enabled` flag | **READY** | Filtro: apenas máquinas ativas no IOE | Nenhuma |
| Vinculação `machine → sector` | **PARTIAL** | FK `machine_monitoring_config → sector_id` não confirmada | Verificar / adicionar em migration futura |
| `machine_detected_events` | **READY** | Fonte de `evidence_refs` via adapter F44 | Nenhuma |

**Veredito Equipamentos:** `PARTIAL` (core READY; FK para setor precisa verificação)

---

### 1.7 `organizationalIdentityEngine`

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| `generateInternalCode()` | **READY** | Código de referência para cargos | Nenhuma |
| `assertDepartmentBelongs()` | **READY** | Validação de FK departamento | Nenhuma |
| `assertSectorBelongs()` | **READY** | Validação de FK setor | Nenhuma |
| HIERARCHY_LEVELS 0–5 | **READY** | Cobertura completa para P0 | Nenhuma |
| Enriquecimento para IA | **READY** | Contexto organizacional para classificação | Nenhuma |
| Níveis 6–8 | **MISSING** | Escalonamento para Conselho/Holding | P2+ |

**Veredito Identity Engine:** `PARTIAL` (P0 READY; P2+ BLOCKED)

---

### 1.8 Company Isolation

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| `company_id` em todas as tabelas operacionais | **READY** | Isolamento base | Nenhuma |
| `tenantRlsFlags.js` | **READY** | Flag de ativação RLS por tenant | Nenhuma |
| `tenantRlsRuntime.js` | **READY** | Runtime de aplicação de RLS | Nenhuma |
| `tenantRlsGovernanceService.js` | **READY** | Governança de isolamento | Nenhuma |
| `db/index.js` — RLS context automático | **READY** | Toda query `db.query()` aplica RLS automaticamente | Nenhuma |

**Veredito Company Isolation:** `READY`

---

### 1.9 Tenant Isolation

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| `crossTenantAttackSimulator.js` | **READY** | Testes de ataque cross-tenant existentes | Executar em CI para tabelas AIOI |
| `tenantFuzzSuite.js` | **READY** | Suite de fuzz para vazamento de dados | Incluir tabelas IOE/outbox |
| RLS policy em `industrial_operational_events` | **MISSING (a criar)** | **CRÍTICO** — tabela IOE precisa de RLS própria | Adicionar em migration IOE |
| RLS policy em `aioi_outbox` | **MISSING (a criar)** | Worker deve filtrar por `company_id` | Adicionar em migration outbox |
| `UNIQUE (company_id, idempotency_key)` | **MISSING (a criar)** | Prevent cross-tenant idempotency collision | Obrigatório na migration IOE |

**Veredito Tenant Isolation:** `PARTIAL` (infra READY; políticas RLS para tabelas AIOI a criar)

---

## 2. Tabela Consolidada de Readiness

| Item | Estado | Impacto no AIOI | Ação Recomendada |
|------|--------|----------------|-----------------|
| Setores | **READY** | Baixo risco | Nenhuma |
| Cargos (P0) | **READY** | Base sólida | Nenhuma |
| Cargos (P2+ Conselho/Holding) | **PARTIAL** | Médio — reservar `audience_key` | Migration P2+ |
| Hierarchy 0–5 | **READY** | Baixo risco | Nenhuma |
| Hierarchy 6–8 | **MISSING** | Bloqueador P2+ | Migration P2+ |
| RBAC base | **READY** | Baixo risco | Nenhuma |
| RBAC filtros Queue API | **MISSING** | Alto — sem filtro, CEO vê fila de outros | Implementar na Queue API P0 |
| Assets | **PARTIAL** | Baixo P0 | FK verificação futura |
| Equipamentos core | **READY** | Base sólida | Nenhuma |
| Equipamentos → setor FK | **PARTIAL** | Médio — classificação automática imprecisa | Verificar migration |
| `organizationalIdentityEngine` P0 | **READY** | Base sólida | Nenhuma |
| `organizationalIdentityEngine` P2+ | **PARTIAL** | Médio | Migration |
| Company isolation | **READY** | Baixo risco | Nenhuma |
| Tenant isolation infra | **READY** | Base sólida | Nenhuma |
| RLS tabelas AIOI | **MISSING** | **CRÍTICO** — sem RLS, leakage de dados | Obrigatório na migration IOE |

---

## 3. Lacunas que Podem Comprometer o AIOI

### 3.1 Classificação Automática

| Lacuna | Risco | Mitigação |
|--------|-------|-----------|
| FK `machine_monitoring_config → sector_id` não confirmada | `sector_id` pode ser NULL no IOE → classificação parcial | Verificar schema; adicionar coluna se ausente |
| Sem `category` inferida automaticamente de `source_type` | IOE pode entrar sem `category` → fila sem classificação | Engine de classificação AIOI P0 deve inferir `category` de regras determinísticas |

### 3.2 Ownership

| Lacuna | Risco | Mitigação |
|--------|-------|-----------|
| `assigned_role_id` pode ser NULL em IOE | CEO não sabe para quem escalar | Fallback: `hierarchy_level` mais alto da empresa |
| Sem mapeamento `equipment → assigned_role` | Máquinas sem responsável cadastrado | Campo opcional P0; obrigatório P1 |

### 3.3 Escalonamento

| Lacuna | Risco | Mitigação |
|--------|-------|-----------|
| Sem cadeia de escalonamento automático AIOI | IOE critical sem resposta pode ficar em aberto | `direct_superior_role_id` em `company_roles` já existe; AIOI lê essa cadeia |
| Níveis 6–8 ausentes | Escalonamento para Conselho/Holding impossível | Reservado P2+; não bloqueia P0 |

### 3.4 Fila Executiva

| Lacuna | Risco | Mitigação |
|--------|-------|-----------|
| Filtro de audiência (`audience_key`) sem enforcement | CEO de empresa A pode ver IOE de empresa B | RLS obrigatório + filtro por `company_id` |
| Sem RLS em `aioi_outbox` | Worker sem `company_id` leak prevention | RLS na migration + `company_id NOT NULL` |

---

## 4. Veredito Global

```
STRUCTURAL_READINESS: PARTIAL
```

**Justificativa:**
- **P0 pode avançar** com as estruturas existentes (setores, cargos 0–5, RBAC base, company isolation, equipamentos)
- **Ações obrigatórias P0:** RLS em tabelas AIOI + filtro Queue API por `company_id`
- **Bloqueadores P2+:** Hierarchy 6–8 (Conselho/Holding); não bloqueiam P0
- **Risco principal:** RLS faltante nas tabelas AIOI novas — CRÍTICO se não implementado

---

*AIOI_STRUCTURAL_READINESS — documento forense, nenhum arquivo operacional alterado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 06*
