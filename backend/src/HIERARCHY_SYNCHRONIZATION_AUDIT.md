# HIERARCHY SYNCHRONIZATION AUDIT — IMPETUS

> **Status:** problema confirmado em produção  
> **Severidade:** alta — corrompe scoping operacional, gates executivos e
> distribuição contextual de módulos  
> **Origem do relatório:** Phase 7 — Sincronização hierárquica canónica

---

## 1. Contexto

A hierarquia organizacional do IMPETUS deveria viver num único lugar:
**`company_roles.hierarchy_level`**.

A tabela `users.hierarchy_level` deveria ser apenas:

- um **cache persistido** dessa fonte (para queries rápidas / filtros antigos),
- ou um **fallback de compatibilidade** para utilizadores sem cargo formal.

Hoje isto não é cumprido. As duas tabelas evoluem de forma independente e
divergente, e várias camadas de runtime (auth, dashboard, gates de módulo,
governance) leem `users.hierarchy_level` directamente — propagando o erro.

### Diagnóstico empírico no banco (snapshot actual)

```sql
SELECT COUNT(*) AS users_with_cr,
       COUNT(*) FILTER (WHERE u.hierarchy_level IS DISTINCT FROM cr.hierarchy_level) AS divergent
FROM users u
JOIN company_roles cr ON cr.id = u.company_role_id
WHERE u.deleted_at IS NULL;
```

Resultado: **8 utilizadores com `company_role_id`, 6 divergentes (75%)**.

Caso paradigmático: CEO Welligton Freitas Machado.

| Campo | `users` | `company_roles` |
|---|---|---|
| `hierarchy_level` | **5** (operador) | **0** (CEO) |
| `name` / `cr.name` | "Welligton…" | "CEO (Diretor Executivo)" |

---

## 2. Pontos de criação / atualização / inferência / default

### 2.1 CREATE — `backend/src/routes/admin/users.js` (linha 352)

```js
const hierarchyLevel = validatedData.role === 'ceo'
  ? 0
  : (area ? (AREA_TO_LEVEL[area] ?? 5) : (validatedData.hierarchy_level ?? 5));
```

**Problemas:**

1. `AREA_TO_LEVEL` é um mapa fechado: `{ Direção: 1, Gerência: 2, Coordenação: 3, Supervisão: 4, Colaborador: 5 }`.  
   Qualquer área customizada (ex. `'Direção Executiva'`, `'Industrial'`,
   `'Manutenção'`) cai no `?? 5` → operador.
2. Ignora completamente o `company_role_id` que o admin escolheu — embora
   `company_roles.hierarchy_level` já seja conhecido nesse momento.
3. CEO é tratado por *string match* (`role === 'ceo'`), não pelo cargo formal.

### 2.2 UPDATE — `backend/src/routes/admin/users.js` (linha 534)

```js
if (validatedData.area) {
  const isCustomArea = !AREA_OPTIONS.includes(validatedData.area);
  validatedData.hierarchy_level = validatedData.area === 'Direção'
    ? 1
    : (AREA_TO_LEVEL[validatedData.area] ?? (isCustomArea ? 5 : validatedData.hierarchy_level));
  ...
}
```

**Problemas:**

1. Reaplica `AREA_TO_LEVEL` em cada update onde `area` é alterada — **mesmo se
   `company_role_id` já está correctamente apontando para CEO/Diretor**.
2. Inconsistência face ao CREATE: aqui CEO/`Direção` ⇒ 1, no CREATE CEO ⇒ 0.
3. `isCustomArea` ⇒ 5 (operador) é o que aconteceu com `'Direção Executiva'`
   no caso Welligton: cargo correcto, area customizada, hierarquia rebaixada
   para 5.
4. Quando `validatedData.company_role_id` muda, **nada é feito** para alinhar
   o `hierarchy_level` ao novo cargo formal.

### 2.3 Bootstrap — `backend/src/routes/companies.js` (linha 80)

```sql
INSERT INTO users (..., area, hierarchy_level, active)
VALUES (..., 'Direção', 1, true)
```

Hardcode aceitável (admin inicial), mas continua sem ler `company_roles`.

### 2.4 Persistência directa — não há outras escritas relevantes

Buscas por `SET hierarchy_level`, `INSERT INTO users`, `UPDATE users` mostram
só os pontos acima. Não há triggers SQL, jobs, nem migrações alterando a
coluna.

### 2.5 Hydration de sessão — `backend/src/middleware/auth.js`

Tanto `validateSession` (l. 63) como `validateJWTAndLoadUser` (l. 163) fazem
`SELECT u.*, cr.dashboard_functional_hint FROM users u LEFT JOIN company_roles cr ...`
**mas nunca selecionam `cr.hierarchy_level`**. Resultado: `req.user.hierarchy_level`
é sempre o `users.hierarchy_level` cru, mesmo quando o cargo formal indica o
contrário.

### 2.6 Camadas que **leem** `users.hierarchy_level`

Pesquisa `hierarchy_level\s*\?\?\s*5` (default operador) encontra:

| Ficheiro | Linha | Default | Risco |
|---|---|---|---|
| `routes/dashboard.js` | 212 | `?? 5` | Telemetria + scoping global |
| `services/liveDashboardService.js` | 314 / 405 / 505 | `?? 5` / `?? null` | Live dashboard executivo |
| `routes/warehouseIntelligence.js` | 40 | `?? 5` | Gate de WMS |
| `routes/qualityIntelligence.js` | 14 / 116 | `?? 5` | Gate de QA |
| `routes/hrIntelligence.js` | 121 | `?? 5` | Gate de HR |
| `routes/rawMaterialLots.js` | 13 | `?? 5` | Gate de matérias-primas |
| `routes/operationalAnomalies.js` | 16 / 190 | `?? 5` | Gate de anomalias / acknowledge |
| `routes/logisticsIntelligence.js` | 14 / 63 | `?? 5` | Gate de logística |
| `services/onboardingService.js` | 54 | `?? 5` | Decide se mostra wizard executivo |
| `routes/intelligentRegistration.js` | 105 | `?? 5` | Gate `/leadership` |
| `dashboardEngineV2/identity/identityResolver.js` | 117 / 185 | passa cru | Motor B identity |
| `dashboardEngineV2/identity/functionResolver.js` | 138 | passa cru | function_type |
| `dashboardEngineV2/composition/compositionEngine.js` | 132 / 157 | passa cru | Composition |
| `dashboardEngineV2/governance/contextRiskEngine.js` | 93+ | passa cru | Risk evidence |
| `dashboardEngineV2/governance/integrityScoreService.js` | 221 | passa cru | Integrity score |
| `contextualModules/moduleOrchestrator.js` | 265 | passa cru | Phase 6 module gating |
| `contextualModules/index.js` | 256 | passa cru | Phase 6 façade |

Conclusão: **toda a topologia executiva-vs-operacional do sistema é definida
por um número que pode estar errado**. Quando `users.hierarchy_level=5` para
um CEO, todos os gates `h <= 2` ou `h <= 4` falham.

---

## 3. Caches operacionais que ficam obsoletos

### 3.1 `dashboard_configs` (DB) — TTL 24h

`dashboardPersonalizadoService` cacheia o config completo por 24 horas em
`dashboard_configs(user_id, config_json, expira_em)`. A invalidação só é
chamada em endpoints **do próprio utilizador** alterando preferências
(linhas 373, 394, 934, 1065 de `routes/dashboard.js`).

**Não é invalidada quando admin altera role / area / company_role_id /
hierarchy_level / functional_area / department.**

### 3.2 `structuralOrgContextService` (memória)

`invalidateCompanyCache(companyId)` é chamada na criação e atualização
(linhas 418 e 595 de `routes/admin/users.js`) **somente quando
`company_role_id` é alterado**. Outros campos de identidade (role, area,
hierarchy_level, functional_area, department) não invalidam.

### 3.3 `hierarchicalFilter` scope (placeholder)

`invalidateScopeCache(userId)` em `middleware/hierarchyScope.js` é um stub
vazio. Nada para invalidar realmente.

### 3.4 Sessões activas

A sessão guarda o snapshot de `users.*` no momento do login (via JOIN), mas
no `validateSession` é refeito o JOIN a cada request — logo, a alteração de
`users.hierarchy_level` é refletida **no próximo request**. Bom.  
Porém, como o JOIN nunca cruza `cr.hierarchy_level`, isto não resolve a
divergência.

---

## 4. Causa raiz consolidada

1. **`AREA_TO_LEVEL` fechado** + `?? 5` operador como default em CREATE/UPDATE
   ⇒ qualquer cargo "fora da caixa" é rebaixado a operador.
2. **Hydration de sessão ignora `cr.hierarchy_level`** ⇒ mesmo após corrigir
   o `company_role_id`, o runtime não usa a fonte canónica.
3. **Update de admin não invalida o cache** `dashboard_configs` (TTL 24h) ⇒
   perfil obsoleto sobrevive um dia.
4. **Sem trigger / sem service que sincronize** `users.hierarchy_level` quando
   `company_role_id` muda.
5. **Defaults `?? 5` espalhados** por 17 ficheiros ⇒ qualquer leitura de
   user incompleto cai em "operador".

---

## 5. Plano de correção (Phases 2–7 deste roadmap)

| Phase | Acção | Onde |
|---|---|---|
| **P2** | Criar `hierarchyResolver` que devolve sempre o nível canónico (cr → users → role → 5) | `services/hierarchyResolver.js` (novo) |
| **P3** | Sincronizar em CREATE / UPDATE / login hydration / runtime | `routes/admin/users.js`, `middleware/auth.js`, `services/userIdentitySync.js` (novo) |
| **P4** | Script READ-SAFE de detecção de inconsistências | `scripts/audit-hierarchy.js` (novo) |
| **P5** | Invalidação em cascata (`dashboard_configs`, `structuralOrgContextService`, identity, profile) | `services/userIdentityCacheBus.js` (novo) |
| **P6** | Manter Motor A funcional, JSON contracts, fallback | revisão aditiva |
| **P7** | Suite de testes 7 personas + cenários canónicos | `tests/hierarchySyncScenarios.js` (novo) |

---

## 6. Princípios

- **Aditivo, não destrutivo.** Nenhum gate antigo é removido — passam todos a
  consultar o novo resolver.
- **Backward-compatible.** `users.hierarchy_level` continua existindo como
  cache; quem nunca migrar continua vendo o valor antigo.
- **Observável.** Toda divergência detectada em runtime emite log
  `[HIERARCHY_DRIFT]` com `user_id`, `users_value`, `cr_value`.
- **Frontend intacto.** Nenhuma alteração visual.
