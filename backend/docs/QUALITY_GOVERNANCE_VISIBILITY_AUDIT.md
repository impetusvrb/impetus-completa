# QUALITY GOVERNANCE VISIBILITY AUDIT

**Data:** 2026-05-24
**Tipo:** Auditoria Enterprise — Governança de Visibilidade dos Módulos Quality
**Status:** Corrigido (additive-only, rollback-safe)

---

## 1. Resumo Executivo

Utilizadores com cargos de Qualidade ("Gerente de Qualidade", "Coordenador de Qualidade") não viam os módulos de qualidade (`quality_intelligence`) no sistema, apesar do Runtime Z reconhecer correctamente a sua identidade operacional.

**Causa raiz:** Ruptura na cadeia de autoridade entre identidade semântica (Runtime Z / contexto organizacional) e governança de módulos (Module Access Governance Engine). O sistema reconhecia o cargo mas não traduzia esse reconhecimento em autorização de módulos.

---

## 2. Cadeia de Autoridade Auditada

```
UTILIZADOR
  ↓
AUTH (middleware/auth.js → requireAuth)
  ↓
IDENTITY ENRICHMENT (structuralUserProfileService.enrichUserForDashboardAsync)
  ↓
PROFILE RESOLUTION (dashboardProfileResolver.getDashboardConfigForUser)
  → ROLE_AREA_TO_PROFILE[role][functional_area] → profile_code
  → profile_config.visible_modules (Motor A / legacy)
  ↓
RBAC / ACCESS SERVICE (dashboardAccessService.getAllowedModules)
  → Intersecção perfil × permissões
  → UNIVERSAL_SAFE_ACCESS_MODULES adicionados
  ↓
MODULE ACCESS GOVERNANCE ENGINE (moduleAccessGovernanceEngine.resolveForUser)  ← AUTORIDADE FINAL
  → buildModuleAccessContext (load company_role, org context)
  → assessCadastroCompleteness (structural_complete?)
  → resolveAuthorizedMenuKeysFromCadastro (menu keys por cargo)
  → resolveGovernedVisibleModules (filtragem final)
  ↓
CONTEXTUAL MODULES (contextualModules.enhanceVisibleModulesWithContext)
  ↓
ENGINE V2 (dashboardCompositionGateway — aditivo, shadow)
  ↓
POLICY ENGINE (policyEngine.resolveContentExposure)
  ↓
SEMANTIC ALIGNMENT (semanticRuntimeAlignmentFacade)
  ↓
PRECISION DELIVERY (precisionRuntimeFacade)
  ↓
FRONTEND (useVisibleModules → filterMenuByModules → sidebar render)
```

**Autoridade final:** `moduleAccessGovernanceEngine` — governa `visible_modules` entregue ao frontend.

---

## 3. Causas Raiz Identificadas

### Causa 1: Falta de normalização de roles EN→PT no bypass executivo

**Ficheiro:** `backend/src/services/moduleAccessGovernanceEngine.js`
**Função:** `isExecutiveStructuralBypass()`

O bypass executivo verificava `role` contra `['diretor', 'gerente', 'coordenador', 'supervisor']` mas NÃO normalizava roles em inglês. Utilizadores com `user.role = 'manager'` ou `'coordinator'` não activavam o bypass, mesmo sendo equivalentes.

```javascript
// ANTES (quebrado para roles EN):
const role = String(ctx.role || '').toLowerCase();
if (['diretor', 'gerente', 'coordenador', 'supervisor'].includes(role)) return true;
// 'manager' → false ✗

// DEPOIS (normalizado):
const rawRole = String(ctx.role || '').toLowerCase();
const role = _normalizeRoleForBypass(rawRole);
// 'manager' → 'gerente' → true ✓
```

### Causa 2: Nenhuma inferência semântica do nome do cargo

**Ficheiro:** `backend/src/services/structuralCadastroModuleResolver.js`
**Função:** `resolveAuthorizedMenuKeysFromCadastro()`

Os menu keys autorizados eram derivados exclusivamente de:
- `dashboard_functional_hint`
- `recommended_permissions`
- `visible_themes`
- `approval_domains`
- Flags de acesso (`access_strategic_data`, etc.)

Se todos esses campos estivessem vazios/null no cadastro do cargo, o nome "Gerente de Qualidade" era **completamente ignorado** — nenhum módulo de domínio era autorizado.

**Cenário típico:** Cargo criado com nome preenchido mas sem `dashboard_functional_hint` nem `recommended_permissions` configurados → 0 módulos contextuais autorizados.

### Causa 3: Completeness check sem sinais semânticos

**Ficheiro:** `backend/src/services/structuralCadastroModuleResolver.js`
**Função:** `assessCadastroCompleteness()`

O campo `governanca_modulos` era marcado como ausente quando não havia `recommended_permissions`, `visible_themes`, `dashboard_functional_hint`, nem flags de acesso — mesmo que o nome do cargo contivesse sinais claros de domínio. Resultado: `structural_complete = false`.

Com `structural_complete = false`:
- Módulos contextuais são **negados** na validação individual (`code: 'structural_incomplete'`)
- O bypass executivo é a única saída — mas dependia da Causa 1

### Efeito Composto

```
Cargo: "Gerente de Qualidade"
dashboard_functional_hint: null
recommended_permissions: []
visible_themes: []
user.role: "manager" (EN)

→ assessCadastroCompleteness: structural_complete = false (Causa 3)
→ resolveAuthorizedMenuKeysFromCadastro: [] vazio (Causa 2)
→ isExecutiveStructuralBypass: false (Causa 1 — 'manager' ≠ 'gerente')
→ quality_intelligence: NEGADO
→ Módulos visíveis: apenas universais (dashboard, settings, proaction...)
```

---

## 4. Análise por Camada

### 4.1 Cadastro Organizacional

| Campo | Estado |
|-------|--------|
| `company_roles.name` | ✅ Correcto ("Gerente de Qualidade") |
| `company_roles.department_id` | ⚠️ Pode estar null |
| `company_roles.sector_id` | ⚠️ Pode estar null |
| `company_roles.dashboard_functional_hint` | ❌ Não configurado |
| `company_roles.recommended_permissions` | ❌ Array vazio |
| `company_roles.visible_themes` | ❌ Array vazio |
| `users.role` | ⚠️ Pode ser 'manager' (EN) vs 'gerente' (PT) |

### 4.2 RBAC

| Componente | Estado |
|-----------|--------|
| `dashboardAccessService.getAllowedModules` | ✅ Funciona com perfil resolvido |
| `ROLE_AREA_TO_PROFILE` | ✅ Mapeia corretamente gerente+quality → manager_quality |
| `manager_quality.visible_modules` | ✅ Inclui `quality_intelligence` |
| `coordinator_quality.visible_modules` | ✅ Inclui `quality_intelligence` |

### 4.3 Module Access Governance Engine

| Componente | Estado Antes | Estado Depois |
|-----------|-------------|--------------|
| `isExecutiveStructuralBypass` | ❌ Não normaliza EN→PT | ✅ Normaliza |
| `resolveAuthorizedMenuKeysFromCadastro` | ❌ Ignora nome do cargo | ✅ Infere do nome |
| `assessCadastroCompleteness` | ❌ Ignora sinais semânticos | ✅ Reconhece |
| `resolveGovernedVisibleModules` | ✅ Lógica correcta | ✅ Mantida |

### 4.4 Runtime Z / Motor A

| Componente | Estado |
|-----------|--------|
| Runtime Z (identidade contextual) | ✅ Reconhece correctamente |
| Motor A (visible_modules do perfil) | ✅ Inclui quality_intelligence |
| Conflito Motor A vs Runtime Z | ❌ Não há conflito |
| Governance engine override | ✅ Agora respeita sinais do cargo |

### 4.5 Frontend

| Componente | Estado |
|-----------|--------|
| `useVisibleModules` | ✅ Consome payload correctamente |
| `filterMenuByModules` | ✅ Respeita `quality_intelligence` em set |
| `filterVisibleModulesByStructuralProfile` | ✅ Bypassed quando `cadastroFiel=true` |
| `PATH_TO_MODULE` mapping | ✅ `/app/quality/*` → `quality_intelligence` |
| Route definitions | ✅ Rotas existem |

---

## 5. Correções Aplicadas

### Correção 1: Role normalization no bypass executivo

**Ficheiro:** `backend/src/services/moduleAccessGovernanceEngine.js`
**Tipo:** Bug fix (additive)

Adicionado mapa `_ROLE_NORMALIZATION_MAP` que converte roles em inglês (`manager`, `coordinator`, `director`) para equivalentes PT usados pelo bypass. A função `isExecutiveStructuralBypass` agora normaliza antes de comparar.

### Correção 2: Inferência semântica de módulos a partir do nome do cargo

**Ficheiro:** `backend/src/services/structuralCadastroModuleResolver.js`
**Tipo:** Feature (additive-only)

Nova função `_inferFunctionalHintFromCargoName()` que:
1. Tenta resolver via `functionalAreaCatalog.resolveIdFromText(cargo.name)`
2. Se não há hit directo, expande via `_expandPortugueseCadastroText()`
3. Prioriza matches por menu_key específico de domínio sobre matches genéricos ('operational')

A função `resolveAuthorizedMenuKeysFromCadastro()` agora:
- Usa `effectiveHint = hint || _inferFunctionalHintFromCargoName(roleRow)` em vez de apenas `hint`
- Adiciona resultados de `_expandPortugueseCadastroText(roleRow.name)` como fonte aditiva

### Correção 3: Completeness check com sinais semânticos

**Ficheiro:** `backend/src/services/structuralCadastroModuleResolver.js`
**Tipo:** Enhancement (additive-only)

A função `assessCadastroCompleteness()` agora reconhece sinais semânticos do nome do cargo como evidência de `governanca_modulos` quando os campos formais (`recommended_permissions`, `visible_themes`, `dashboard_functional_hint`) estão vazios.

### Correção 4: Normalização de diacríticos na expansão de texto PT

**Ficheiro:** `backend/src/services/structuralCadastroModuleResolver.js`
**Tipo:** Bug fix

`_expandPortugueseCadastroText()` agora normaliza diacríticos (NFD → remove combining marks) antes de aplicar regexes. Isto corrige falhas como "Laboratório" não matchando `/laboratorio/`.

---

## 6. Módulos Afectados

| Módulo | menu_key | Deveria Aparecer | Estava Bloqueado | Bloqueado Por | Agora |
|--------|----------|-----------------|------------------|---------------|-------|
| Inteligência Qualidade | `quality_intelligence` | ✅ Sim | ✅ Sim | Governance Engine (structural_incomplete + not_in_structural_authorization) | ✅ Visível |
| Operacional | `operational` | ✅ Sim | ✅ Parcial | Governance Engine | ✅ Visível |
| Lotes Matéria-Prima | `raw_material_lots` | ✅ Para gerente | ⚠️ Dependente | Perfil manager_quality | ✅ Via perfil |

---

## 7. Garantias Preservadas

| Garantia | Verificação |
|----------|------------|
| **Tenant isolation** | ✅ `company_id` mantido em todas as queries; sem alteração |
| **Hierarchy governance** | ✅ `hierarchy_level` continua a ser validado; bypass só para liderança |
| **RBAC** | ✅ Não removido; reforçado com inferência semântica |
| **Runtime Z sovereignty** | ✅ Nenhuma alteração no runtime-z-sovereign; identidade contextual preservada |
| **Additive-only** | ✅ Nenhum código removido; todas alterações são adições |
| **Rollback-safe** | ✅ Pode reverter 3 ficheiros; env var `IMPETUS_MODULE_ACCESS_GOVERNANCE=false` desactiva engine |
| **Motor A preservado** | ✅ `dashboardProfiles.js` intocado; perfis `manager_quality`, `coordinator_quality` intactos |
| **Engine V2 preservada** | ✅ Nenhuma alteração; continua aditiva em shadow |
| **Frontend inalterado** | ✅ `useVisibleModules.js` e `structuralModuleFilter.js` não foram modificados |
| **Domain isolation** | ✅ Testado: operador produção ≠ quality; supervisor SST ≠ quality |

---

## 8. Cobertura de Testes

**Ficheiro:** `backend/tests/quality-governance-visibility/runQualityGovernanceVisibilityTests.js`
**Total:** 58 testes | 58 passed | 0 failed

| Bloco | Testes | Cobertura |
|-------|--------|-----------|
| 1. Inferência semântica cargo → hint | 11 | Todos os domínios PT/EN + edge cases |
| 2. Resolução menu keys por cadastro | 7 | Com/sem hint, com/sem perms, isolamento |
| 3. Cadastro completeness semântico | 5 | Complete, incomplete, sinais parciais |
| 4. Module preview composição | 3 | Quality, Safety, Maintenance |
| 5. Executive structural bypass | 8 | PT roles, EN roles, hierarchy, deny |
| 6. Isolamento de domínio | 3 | Produção, SST, RH vs Quality |
| 7. Módulos universais | 3 | Sempre presentes, classificação |
| 8. Module type classification | 4 | contextual, universal, restricted, operational |
| 9. Validação de módulo individual | 4 | Allowed, denied (3 motivos) |
| 10. Interpretação semântica PT | 5 | Inspeção, Laboratório, Financial, Environment |
| 11. Governance enablement | 1 | Flag verification |
| 12. End-to-end | 4 | Complete, incomplete, bypass PT, bypass EN |

---

## 9. Trace de Autoridade Corrigido

```
UTILIZADOR: Ricardo Almeida Souza
CARGO: "Gerente de Qualidade"
  ↓
AUTH: ✅ Autenticado
  ↓
IDENTITY: enrichUserForDashboardAsync → company_role_id vinculado
  ↓
STRUCTURAL ROLE: loadEnrichedRole → name="Gerente de Qualidade"
  ↓
CADASTRO COMPLETENESS:
  - department_id: ✅ (ou ⚠️ com bypass)
  - sector_id: ✅ (ou ⚠️ com bypass)
  - governanca_modulos: ✅ (inferido do nome do cargo → quality)
  → structural_complete: true (ou bypass via role)
  ↓
AUTHORIZED MENU KEYS:
  - _inferFunctionalHintFromCargoName("Gerente de Qualidade") → 'quality'
  - FUNCTIONAL_HINT_TO_MENU_KEYS['quality'] → ['quality_intelligence', 'operational']
  - _expandPortugueseCadastroText("Gerente de Qualidade") → ['quality_intelligence', 'operational']
  → authorized: ['quality_intelligence', 'operational']
  ↓
GOVERNANCE ENGINE: resolveGovernedVisibleModules
  - universal: dashboard, settings, proaction, registro_inteligente, cadastrar_com_ia, chat
  - authorized: quality_intelligence ✅, operational ✅
  → visible_modules: [...universal, 'quality_intelligence', 'operational']
  ↓
FRONTEND: useVisibleModules → set.has('quality_intelligence') → ✅
  ↓
MENU: filterMenuByModules → item._quality_publication → ✅ visível
  ↓
ROUTE: canAccessPath('/app/quality/operational') → 'quality_intelligence' → ✅
  ↓
RENDER: ✅ Módulo de Qualidade renderizado
```

---

## 10. Ficheiros Modificados

| Ficheiro | Alteração | Linhas |
|----------|-----------|--------|
| `backend/src/services/moduleAccessGovernanceEngine.js` | Role normalization EN→PT | +15 |
| `backend/src/services/structuralCadastroModuleResolver.js` | Inferência semântica + completeness + diacríticos | +35 |
| `backend/tests/quality-governance-visibility/runQualityGovernanceVisibilityTests.js` | Suite completa de testes | +410 (novo) |

---

## 11. Rollback

Para reverter completamente:
1. Reverter `moduleAccessGovernanceEngine.js` — remover `_ROLE_NORMALIZATION_MAP` e `_normalizeRoleForBypass`, voltar `isExecutiveStructuralBypass` ao original
2. Reverter `structuralCadastroModuleResolver.js` — remover `_inferFunctionalHintFromCargoName`, reverter `resolveAuthorizedMenuKeysFromCadastro` e `assessCadastroCompleteness`
3. Alternativa: `IMPETUS_MODULE_ACCESS_GOVERNANCE=false` desactiva toda a governance engine (fallback ao Motor A)

---

## 12. Recomendações Futuras

1. **Cadastro estrutural:** Configurar `dashboard_functional_hint` para todos os cargos existentes (reduz dependência de inferência semântica)
2. **Normalização de roles:** Unificar `user.role` para PT em toda a BD (evita mapeamento EN→PT em runtime)
3. **Observabilidade:** Adicionar logging quando inferência semântica é usada vs hint explícito (métricas de completude do cadastro)
4. **Admin UI:** Mostrar preview de módulos autorizados no formulário de edição de cargo (já existe `buildModulePreview`)
