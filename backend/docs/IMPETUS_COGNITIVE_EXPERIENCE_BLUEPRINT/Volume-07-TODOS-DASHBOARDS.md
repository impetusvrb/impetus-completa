# Volume VII — Todos os Dashboards
## ICEB v1.0 · Perfis e composição

**Fonte canónica:** `backend/src/config/dashboardProfiles.js` (23 perfis — fichas etapas **440–462**)

---

## 7.1 Perfis dashboard (índice)

| profile_key | Audiência | Widgets típicos |
|-------------|-----------|-----------------|
| `ceo_executive` | CEO | KPIs executivos, ecossistema, custos |
| `director_operations` | Diretor ops | produção, OEE, alertas |
| `director_hr` | Diretor RH | headcount, turnover, pulse RH |
| `director_finance` | Diretor financeiro | custos, vazamento |
| `director_quality` | Qualidade | NC, CAPA, inspeções |
| `director_safety` | SST | incidentes, treinamentos |
| `manager_*` | Gerentes | equipe, tarefas |
| `operator` | Operador | tarefas chão de fábrica |
| `mechanic` | Mecânico | OS, ManuIA strip |
| `supervisor` | Supervisor | pulse gestão |
| … | ver fichas perfis | … |

---

## 7.2 Resolução de perfil

```
user.role + company_role.functional_area + dashboard_functional_hint
    → dashboardProfileResolver
    → LayoutPorCargo.js (widgets)
```

**AB:** `dashboard.js` `GET /me` retorna `dashboard_profile` e `visible_modules`.

---

## 7.3 Cockpits de domínio

| Cockpit | Rota | Painéis |
|---------|------|---------|
| Quality Operational | `/app/quality/operational` | NcrCapaPanel, inspeção, kiosk |
| Safety Operational | `/app/safety/operational` | SafetyIncidentPanel |
| Environment | `/app/environment/operational` | EventsPanel |
| Logistics | `/app/logistics/operational` | workspace |
| Centro Operações Industrial | `/app/centro-operacoes-industrial` | mapa máquinas |
| Cérebro Operacional | `/app/cerebro-operacional` | alertas cross-domain |

---

## 7.4 Personalização (`dashboardComposerService`)

**Classificação:** AB — composição dinâmica por tenant; sujeito a governança de módulos visíveis.

---

## 7.5 Fichas ICEB

- Perfis: `fichas/perfis/0440-*.md` … `0462-*.md`
- Telas dashboard: `fichas/telas/` (filtrar `Dashboard`, `Centro`, `Pulse`)

---

*Volume VII · ICEB v1.0 · 2026-06-30*
