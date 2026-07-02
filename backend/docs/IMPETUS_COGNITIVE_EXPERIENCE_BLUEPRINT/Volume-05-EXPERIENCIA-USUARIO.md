# Volume V — Experiência do Utilizador
## ICEB v1.0 · Jornada login → operação

---

## 5.1 Fluxo principal

```
Login (/) → SetupEmpresa (se incompleto) → validacao-cargo (se pendente)
    → DashboardRouteEntry → dashboard por perfil
    → Layout (menu + pulso global) → módulos visíveis
```

**Classificação:** AB — guards em `App.jsx`.

---

## 5.2 Guards (ordem canónica)

| Guard | Função | Ficheiro |
|-------|--------|----------|
| `PrivateRoute` | autenticação JWT | `App.jsx` |
| `SetupGuard` | setup empresa | `App.jsx` |
| `CEORouteGuard` | rotas CEO-only | `App.jsx` |
| `ColaboradorRouteGuard` | bloqueia colaborador simples | `App.jsx` |
| `AdminRouteGuard` | admin tenant | `App.jsx` |
| `StrictAdminRouteGuard` | admin Impetus | `App.jsx` |
| `RoleGuard` | roles explícitos | `App.jsx` |
| `FactoryTeamMemberGate` | domínios operacionais | domínios quality/safety/etc. |

---

## 5.3 Design System Industrial 4.0

**Fontes:** `frontend/src/styles/tokens.css`, `frontend/src/styles.css`

| Regra | Token / padrão |
|-------|----------------|
| Fundos escuros | `--bg-primary` … `--bg-tertiary` |
| Acentos | `--cyan`, `--green`, `--amber`, `--red` |
| Tipografia | Rajdhani + Share Tech Mono |
| `border-radius` | ≤ 8px |
| Botão primário | translúcido cyan |
| Grade técnica | `body` / `#root` |

---

## 5.4 Estados de interface

| Estado | Padrão | Proibido |
|--------|--------|----------|
| Loading | skeleton / mono label | spinner genérico branco |
| Vazio | mensagem técnica mono | mock arrays fixos |
| Erro | `--red` + código | toast Material claro |
| 403 | redirect ou painel deny | menu com módulo proibido visível |

---

## 5.5 Drawer Saúde do Sistema

**Componente:** integrado em `Layout.jsx`  
**API:** status operacional tenant-scoped  
**Classificação:** AB

---

## 5.6 Fichas ICEB

Telas de jornada: etapas **336–345** (Login, Setup, Validação cargo) em `fichas/telas/`.

---

*Volume V · ICEB v1.0 · 2026-06-30*
