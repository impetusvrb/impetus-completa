# Auditoria — Eixo funcional contextual (Meio Ambiente vs Qualidade)

**Data:** 2026-05-18  
**Escopo:** Cadeia de inferência `functional_axis` → `dashboard_profile` → módulos / IA contextual  
**Restrições:** Alterações aditivas; sem mudança de CSS / Design System; Motor A/B preservados.

---

## 1. Sintoma reportado

Utilizador com cargo **Coordenador de Meio Ambiente**, departamento **Meio Ambiente**, recebia:

- `functional_axis` / área inferida como **quality**
- Dashboard e menu: SPC, CAPA, governança de qualidade, fornecedores qualidade

**Esperado:** `environmental` + `coordinator_environmental` + `environment_intelligence`.

---

## 2. Cadeia de resolução (mapeamento)

| Camada | Ficheiro | Responsabilidade |
|--------|----------|------------------|
| Catálogo canónico | `backend/src/config/functionalAreaCatalog.js` | IDs, labels, aliases, `hasEnvironmentalSemanticSignal` |
| Resolver prioritário | `backend/src/services/functionalAxisResolver.js` | Prioridade 1–10, guard ambiental, logs JSON |
| Perfil dashboard | `backend/src/services/dashboardProfileResolver.js` | `resolveDashboardProfile`, `getDashboardConfigForUser` |
| Perfis / módulos | `backend/src/config/dashboardProfiles.js` | `ROLE_AREA_TO_PROFILE`, perfis `*_environmental` |
| Motor B — eixos | `backend/src/services/profileContextInterpreter.js` | `eixo_ambiental`, penalização quality por “coleta/amostra” |
| Motor B — identidade | `backend/src/dashboardEngineV2/identity/identityResolver.js` | `AXIS_TO_AREA` inclui ambiental |
| Motor B — catálogo eixos | `backend/src/dashboardEngineV2/axes/axesPriorityCatalog.js` | Secções `environmental`, `sustainability`, `utilities`, `esg` |
| Módulos contextuais | `backend/src/contextualModules/moduleRegistry.js` | `environment_intelligence`, `compatible_areas` |
| API dashboard | `backend/src/routes/dashboard.js` | `GET /dashboard/me` expõe `functional_axis`, `contextual_modules_hint` |
| Admin utilizadores | `backend/src/routes/admin/users.js` | Zod + `GET .../meta/functional-areas` |
| Frontend admin | `frontend/src/pages/AdminUsers.jsx` | Select alimentado pela API do catálogo |

---

## 3. Causas raiz identificadas

1. **`profileContextInterpreter`** — keywords `auditoria`, `analise`, `coleta`, `amostra` em `eixo_qualidade` / `eixo_laboratorial` pontuavam qualidade para perfis ambientais com coleta de amostras.
2. **`inferAreaFromFreeText`** — sem ramo ambiental explícito antes de heurísticas operacionais.
3. **`JOB_TITLE_TO_AREA` / `ROLE_AREA_TO_PROFILE`** — fallbacks genéricos `coordenador` → `production` (não quality directo), mas sem mapeamento `environmental`.
4. **`AREA_ALIASES` (Engine V2)** — ausência de `meio_ambiente`, `ambiental`, `ehs`, `utilities`.
5. **`identityResolver`** — `eixo_laboratorial` → `quality`; `eixo_seguranca` → `operations` (corrigido para domínios dedicados).
6. **Formulário admin** — `FUNCTIONAL_AREA_OPTIONS` limitado a 8 valores; impossível fixar `environmental` manualmente.
7. **`moduleRegistry`** — `environment_intelligence` ausente do registry declarativo.

---

## 4. Heurísticas removidas / bloqueadas

| Regra proibida | Mitigação |
|----------------|-----------|
| `coordenador` → quality | Fallback liderança → `operations`; quality só com sinal semântico de qualidade |
| `governança` → quality | Removido de keywords genéricas de `eixo_qualidade` |
| `coleta` / `amostra` → quality em contexto ambiental | `environmental_guard` + penalização no interpreter |
| Inferência quality com guard activo | Override para `environmental` + log `[QUALITY_AXIS_BLOCKED]` |

---

## 5. Prioridade semântica oficial (implementada)

1. `functional_area` / `company_role_dashboard_hint` explícitos  
2. `department` / `department_resolved_name`  
3. `job_title` (texto)  
4. `area` (legado)  
5. `hr_responsibilities` / descrição  
6. Texto agregado (catálogo)  
7. `profileContextInterpreter` (Motor B)  
8. `inferAreaFromJobTitle` (só títulos não genéricos)  
9. Fallback por `role` (nunca quality por coordenador isolado)  

---

## 6. Áreas funcionais — catálogo

Fonte: `functionalAreaCatalog.js` — 40+ entradas com aliases, incluindo:

Produção, Operações, Manutenção, Qualidade, Meio Ambiente, Sustentabilidade, EHS, SMS/SST, RH/DP, Finanças, Compras, Logística, PCP, Engenharia, Utilidades, TI, Jurídico, Comercial, Projetos, Governança, Compliance, Auditoria, Diretoria, Industrial, Energia, Laboratório, P&D, ESG, etc.

API: `GET /api/admin/users/meta/functional-areas`

---

## 7. Domínio ambiental

- **Eixo:** `environmental` (e correlatos `sustainability`, `esg`, `environmental_health_safety`, `utilities`)
- **Perfis:** `coordinator_environmental`, `manager_environmental`, `supervisor_environmental`
- **Módulo menu:** `environment_intelligence`
- **Hints contextuais:** `environmental`, `sustainability`, `utilities`, `waste_management`, `environmental_governance`, `esg`, …

---

## 8. Logs estruturados

| Tag | Quando |
|-----|--------|
| `[FUNCTIONAL_AXIS_RESOLVED]` | Resolução final |
| `[FUNCTIONAL_AXIS_MANUAL_PRIORITY]` | Área explícita |
| `[ENVIRONMENTAL_AXIS_RESOLVED]` | Eixo ambiental/ESG |
| `[QUALITY_AXIS_BLOCKED]` | Guard impediu quality |
| `[CONTEXTUAL_DOMAIN_INFERENCE]` | Erros / passos interpreter |

---

## 9. Testes

```bash
cd backend && npm run test:contextual-functional-axis
```

Cobre: coordenador ambiental, EHS, sustentabilidade, qualidade/RH/PCP/produção, prioridade manual, guard, catálogo, retrocompat.

---

## 10. Evidência esperada (JSON)

```json
{
  "functional_axis": "environmental",
  "dashboard_profile": "coordinator_environmental",
  "department": "Meio Ambiente",
  "contextual_modules": [
    "environmental",
    "sustainability",
    "utilities",
    "waste_management",
    "environmental_governance"
  ],
  "visible_modules": [
    "dashboard",
    "operational",
    "proaction",
    "biblioteca",
    "ai",
    "environment_intelligence",
    "settings"
  ]
}
```

---

## 11. Retrocompatibilidade

- Campos legacy (`functional_area`, `profile_code`, `visible_modules`) inalterados em contrato.
- Novos campos em `/dashboard/me`: `functional_axis`, `functional_area_label`, `functional_area_source`, `contextual_modules_hint` (aditivos).
- Utilizadores sem sinal ambiental mantêm comportamento anterior (quality, production, operations).
- Motor A/B: sem remoção de flags ou gateways.

---

## 12. Deploy recomendado

```bash
cd /var/www/impetus-completa/backend && npm run test:contextual-functional-axis
cd /var/www/impetus-completa/frontend && npm run build
pm2 reload impetus-backend --update-env
pm2 reload impetus-frontend --update-env
```
