# M1.5B.5 — HR Promotion (RH / HR Intelligence)

**Data:** 2026-06-15  
**Fase:** M1.5B — Shadow → Full Promotion  
**Modo:** Additive only · Truth Program · Runtime AIOI · P0A–P0E · TRI-AI preservados  
**Backup pré-promoção:** `backend/.env.backup_pre_m1_5b_20260615_205044`

---

## Veredicto

```json
{
  "phase": "M1.5B.5",
  "domain": "hr",
  "promoted": true,
  "verdict": "HR_FULL_PROMOTION_COMPLETE"
}
```

---

## 1. Promoção aplicada

| Variável (spec M1.5B) | Valor spec | Valor canónico aplicado | Motivo |
|----------------------|------------|-------------------------|--------|
| `IMPETUS_HR_COGNITIVE_RUNTIME` | `production_native` | **`hr_native`** | `phaseZ26FeatureFlags.js` |

**Runtime auxiliares preservados:**

| Flag | Valor |
|------|-------|
| `IMPETUS_HR_NATIVE_COCKPIT` | `on` |

**Acção:** `pm2 restart impetus-backend --update-env` executado.

---

## 2. Validação runtime pós-promoção

```json
{
  "cognitive_runtime_active": true,
  "cognitive_runtime_shadow": false,
  "hr_native_cockpit": "on",
  "is_hr_native_cockpit_pilot": true
}
```

**Fonte:** `phaseZ26FeatureFlags.js`

---

## 3. Validações por dimensão

### 3.1 HR Intelligence

| Rota | Estado |
|------|--------|
| `GET /api/hr-intelligence/dashboard` | ✅ Montada (auth) |
| `GET /api/hr-intelligence/indicators` | ✅ |
| `GET /api/hr-intelligence/records` | ✅ |
| `GET /api/hr-intelligence/alerts` | ✅ |
| `POST /api/hr-intelligence/alerts/:id/acknowledge` | ✅ |
| `GET /api/hr-intelligence/integration-status` | ✅ |
| `GET /api/hr-intelligence/team-impact` | ✅ |

Serviço: `hrIntelligenceService.js`  
Registo: `server.js` → `useRoute('/api/hr-intelligence', ...)`

### 3.2 Indicadores

Tabela BD: `hr_indicators_snapshot`  
Layout UI: `isHrDashboardLayout` via `roleUtils` + `LayoutPorCargo.js`

### 3.3 Alertas

Tabela BD: `hr_alerts`  
API acknowledge operacional com `requireAuth`.

### 3.4 Distribuição inteligente

Tabela BD: `hr_report_distribution`  
Integração TRI-AI para relatórios (M1.5A).

### 3.5 Restrições de contexto IA

`secureContextBuilder.js`: utilizadores sem `VIEW_HR` recebem restrição explícita no prompt — preservado.

---

## 4. Rollback

```bash
cp backend/.env.backup_pre_m1_5b_20260615_205044 backend/.env
pm2 restart impetus-backend --update-env
```

---

## 5. Notas

- Sem bounded context `domains/hr/` — legacy via `hrIntelligenceService` (conforme M1.5A).
- Integração AIOI indirecta via eixo_humano / structural modules.
- Nenhum schema alterado. Nenhum código removido.
