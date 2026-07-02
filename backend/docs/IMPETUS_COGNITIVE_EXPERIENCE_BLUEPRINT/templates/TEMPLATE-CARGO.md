# Template — Cargo / Persona

> Volume III — uma arquitectura por cargo.

---

## Identificação

| Campo | Valor |
|-------|-------|
| **Persona** | (ex.: CEO, Diretor RH, Operador chão) |
| **role** | `ceo`, `diretor`, … |
| **dashboard_profile** | `ceo_executive`, `hr_management`, … |
| **functional_area** | `executive`, `hr`, … |
| **hierarchy_level** | 0–5 |
| **company_role exemplo** | Nome na Base Estrutural |

---

## Identidade estrutural

| Campo obrigatório | Valor |
|-------------------|-------|
| department_id | |
| sector_id | |
| dashboard_functional_hint | |
| recommended_permissions | |
| visible_themes / hidden_themes | |

---

## Módulos (`visible_modules`)

**Permitidos:**

**Proibidos (domínio):**

**Universais sempre:**

---

## Menu lateral

- Template base: `MENUS[role]` / injecções Layout
- Ordem dos itens:
- Itens **nunca** mostrados:

---

## Dashboard vivo

- Widgets (`LayoutPorCargo.js`):
- KPIs (`dashboardProfiles.js` cards):
- Ecossistema cognitivo: expandido? modos?

---

## Profundidade de IA

- `ia_data_depth`: consolidated / operational / …
- Grounding permitido:
- Domínios negados no chat:

---

## Modos operacionais

| Modo | Quando |
|------|--------|
| executivo | |
| crise | |
| auditoria | cadastro incompleto |

---

## Jornada típica

1. Login → …
2. Dashboard → …
3. …

---

## Excepções documentadas

(contas duplicadas, bypass, tenant admin, …)

---

## Evidências AB

- `dashboardProfiles.js`
- `moduleAccessGovernanceEngine.js`
- Teste: `test:domain-isolation` / persona específica

---

*Template ICEB v1.0*
