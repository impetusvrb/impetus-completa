# Volume III — Arquitetura por Cargo
## ICEB v1.0 · Ecossistema cognitivo universal

**Princípio normativo (N):** Todo utilizador autenticado com `company_id` e cargo na Base Estrutural recebe experiência cognitiva **personalizada pelo cargo**, não por nome de utilizador nem por role genérico isolado.

Cada capítulo seguirá [templates/TEMPLATE-CARGO.md](./templates/TEMPLATE-CARGO.md).

**Fontes canónicas:**
- Perfil dashboard: `backend/src/config/dashboardProfiles.js`
- Menu: `frontend/src/components/Layout.jsx` + `moduleAccessGovernanceEngine.js`
- Audiência cognitiva: `backend/src/services/cognitiveAudienceResolver.js`
- Pulso: `backend/src/services/cognitivePulseService.js`
- UI: `CognitivePresenceShell`, `CognitiveCompactPresence`, `Layout.jsx`

---

## Cadeia única — Base Estrutural → experiência

```
company_roles + user.company_role_id
        ↓
structuralUserProfileService (enrich)
        ↓
├─ moduleAccessGovernanceEngine → visible_modules / menu
├─ dashboardProfileResolver → widgets / layout
└─ cognitiveAudienceResolver → pulso / previsões / agentes / domínios
        ↓
Frontend: Layout (pulso global) + dashboard (shell completo em /app)
```

**Proibido:** exemplificar apenas um utilizador (ex.: diretora RH) como referência única do ecossistema. Joyce Silva e Juh rodrigues são **casos de teste**, não arquétipos exclusivos.

---

## Índice de personas

| Cap. | Persona | role | dashboard_profile (ex.) | functional_area | Eixo cognitivo | Prioridade doc |
|------|---------|------|-------------------------|-----------------|----------------|----------------|
| 3.1 | **CEO / Executivo** | `ceo` | `ceo_executive` | `executive` | `executive` | P0 |
| 3.2 | **Diretor** (genérico) | `diretor` | `director_*` | por área | hint estrutural | P0 |
| 3.3 | **Diretor RH** | `diretor` | `director_hr` / `hr_management` | `hr` | `hr` | P0 |
| 3.4 | **Diretor Financeiro** | `diretor` | `director_financial` | `finance` | `finance` | P1 |
| 3.5 | **Diretor Industrial** | `diretor` | `director_industrial` | `industrial` | `operations` | P1 |
| 3.6 | **Gerente** | `gerente` | `manager_*` | por área | hint | P1 |
| 3.7 | **Coordenador / Supervisor** | `coordenador`, `supervisor` | `coordinator_*`, `supervisor_*` | por área | hint | P2 |
| 3.8 | **Operador** | `operador` | `operator_floor` | `production` | `production` | P1 |
| 3.9 | **Colaborador** | `colaborador` | `operational_base` | variável | hint / eixo | P1 |
| 3.10 | **Técnico Manutenção** | `colaborador` | `technician_maintenance` | `maintenance` | `maintenance` | P1 |
| 3.11 | **Administrador sistema** | `admin` | `admin_system` | `admin` | — (chatbot) | P1 |
| 3.12 | **Auditor / Consultor** | permissões | audit / portal | — | conforme escopo | P2 |

---

## Exposição cognitiva por superfície

| Superfície | CEO | Diretor RH | Operador | Manutenção | Outras rotas |
|------------|-----|------------|----------|------------|--------------|
| `/app` shell completo | CentroComando | CentroComando | DashboardOperador + shell | DashboardMecanico + shell | CentroComando |
| Faixa compacta (Layout) | — | em `/app/rh/*`, settings, etc. | em rotas fora `/app` | idem | todas exceto `/app` |
| Previsões turnover | negado | permitido | negado | negado | só se `is_hr` |
| ManuIA no menu | negado | negado | se módulo | se módulo | governança |

---

## Capítulo 3.1 — CEO / Executivo (rascunho AB)

### Identidade **AB**
- Perfil: `ceo_executive` · Área: `executive` · Hint: `executive`

### Ecossistema **AB**
- Modo operacional: `executivo` / war room conforme alertas
- Cross-analysis: domínios executivos; **sem** turnover nem NC de chão
- Mapa Industrial se `operational` em `visible_modules`

### Proibidos **AB**
`manuia`, `quality_intelligence`, `safety_intelligence`, … (ver `domainRegistry.js`)

---

## Capítulo 3.3 — Diretor RH (rascunho AB)

*Um entre muitos — mesma regra que 3.4–3.10.*

### Identidade **AB**
- Perfil: `director_hr` / `hr_management` · Área: `hr` · Eixo: `eixo_humano`

### Ecossistema **AB**
- Previsões: turnover, clima
- Consultor: padrões de pessoas (não chão de fábrica)
- Menu: `hr_intelligence`, universais; **sem** ManuIA salvo cadastro

---

## Capítulo 3.8 — Operador (rascunho AB)

### Identidade **AB**
- Perfil: `operator_floor` · Área: `production`

### Ecossistema **AB**
- Shell cognitivo em `/app` com audiência `production`
- Faixa compacta em outras rotas (ex.: registro, chat)
- KPIs de máquina; **sem** gráficos financeiros executivos

---

## Capítulo 3.10 — Técnico Manutenção (rascunho AB)

### Identidade **AB**
- Perfil: `technician_maintenance` · Área: `maintenance`

### Ecossistema **AB**
- Shell + OS, preventivas, agentes de manutenção
- Cross-analysis: manutenção, produção, eficiência
- Chat com prefixo de contexto técnico (dashboard mecânico)

---

## Capítulos 3.2, 3.4–3.7, 3.9, 3.11–3.12

*A preencher com template completo — meta 2–3 páginas por persona.*

---

## Matriz domínio → módulos exclusivos

| Área | Módulos típicos exclusivos | Filtro cognitivo |
|------|---------------------------|------------------|
| maintenance | `manuia` | `is_maintenance` |
| quality | `quality_intelligence` | `is_quality` |
| hr | `hr_intelligence` | `is_hr` |
| finance | `financial_intelligence` | eixo financeiro |
| executive | estratégico transversal | `is_executive` |

Fonte: `domainRegistry.js`, `cognitiveAudienceResolver.js`

---

*Volume III · v1.1 — ecossistema universal por cargo*
