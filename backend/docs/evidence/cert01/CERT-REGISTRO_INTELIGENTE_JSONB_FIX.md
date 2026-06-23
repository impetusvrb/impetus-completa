# CERT — REGISTRO-INTELIGENTE-JSONB-FIX

**Classe:** FIX (P0) | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Erro:** `invalid input syntax for type json` ao salvar Registro Inteligente

---

## 1. Causa raiz (confirmada)

Colunas **JSONB** em `intelligent_registrations`:

| Coluna | Tipo |
|--------|------|
| subcategories | jsonb |
| activities_detected | jsonb |
| problems_detected | jsonb |
| pendencies_detected | jsonb |
| suggestions_detected | jsonb |
| ai_metadata | jsonb |

O serviço passava **arrays JavaScript** directamente ao `node-pg`. O driver serializa arrays como literal PostgreSQL `{a,b}` — **inválido** para tipo `jsonb`.

**Prova reproduzida:**

```
raw array FAIL: invalid input syntax for type json
JSON.stringify + ::jsonb → INSERT OK
```

**Frontend:** payload correcto (`text`, `shift_name` opcional, `FormData` para anexos). **Não era bug de UI.**

---

## 2. Correção aplicada

### `backend/src/utils/jsonbParam.js` (novo)

`serializeJsonbParam(value, emptyFallback)` — produz string JSON válida; rejeita strings JSON inválidas.

### `intelligentRegistrationService.js`

- `buildRegistrationJsonbParams(processed)` — serializa todos os campos jsonb
- INSERT com casts explícitos `$N::jsonb` em **todas** as variantes (com/sem `operational_team_member_id`, legado)
- `normalizeOptionalShiftName()` — `undefined`/vazio → `null`

### `intelligentRegistration.js` (rota)

Normaliza `shift_name` vazio → `null` antes do serviço.

---

## 3. Inalterado

- Fluxo IA (`processWithAI`)
- Upload de anexos
- Schema PostgreSQL
- Frontend `RegistroInteligente.jsx` (payload já correcto)

---

## 4. Testes de regressão

Ficheiro: `backend/src/tests/intelligent-registration/jsonbInsertScenarios.js`

| Cenário | Resultado |
|---------|-----------|
| Sem anexos | ✅ INSERT |
| Turno vazio | ✅ INSERT |
| Análise IA completa | ✅ INSERT |
| Com foto (metadata) | ✅ INSERT |
| Com áudio transcrito | ✅ INSERT |
| Unit `serializeJsonbParam` | ✅ |
| String JSON inválida | ✅ throw explícito |

Execução:

```bash
cd backend && node src/tests/intelligent-registration/jsonbInsertScenarios.js
```

---

## 5. Critérios de aceite

| Critério | Estado |
|----------|--------|
| Registro salva sem erro PostgreSQL | ✅ |
| Campos opcionais (turno, anexos) | ✅ |
| JSON válido em colunas jsonb | ✅ |
| Sem mocks / fallback que esconda erro | ✅ |
| Testes de regressão | ✅ |
| PM2 backend reiniciado | ✅ |

---

## 6. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `backend/src/utils/jsonbParam.js` | Novo utilitário |
| `backend/src/services/intelligentRegistrationService.js` | Serialização jsonb |
| `backend/src/routes/intelligentRegistration.js` | shift_name normalizado |
| `backend/src/tests/intelligent-registration/jsonbInsertScenarios.js` | Regressão |
| `backend/docs/FUNCTIONAL_MATRIX.json` | Entrada VALIDADO |
