# SST — Relatório de Validação de Audiência

**Componente:** `SafetyAudienceValidationRuntime`  
**Objectivo:** garantir visibilidade, publication e capabilities coerentes por perfil.

---

## Validações

- Audiência correcta (band vs módulos visíveis).
- Publication consistente com manifest (`safetyNavigationManifest.js`).
- Detecção de excesso de menus por band.
- Falhas de visibilidade (módulo esperado ausente / indevido presente).

---

## Perfis e expectativas UX

| Perfil | Expectativa |
|--------|-------------|
| Operador | mobile-first, fluxo linear, poucos cliques, densidade compact |
| Técnico SST | híbrido operacional + governança |
| Coordenador | tactical, analytics moderados |
| Diretor | executive, dashboards, riscos |
| Auditor | audit density, rollout read-only |

---

## Manifest pilot

Item `safety_pilot_validation` visível para: coordinator, director, auditor, sst_technician — **não** forçado para operador de campo (reduz ruído cognitivo).

---

## Métricas

- `failure_count` / `failure_rate` no pacote de validação.
- Observability: `safety_audience_validation_failures`.

---

## Decisão

Em shadow: validar tenant a tenant com `audience_samples` no body do `/pack`.  
Se `failure_rate > 0.2` → **ADJUST_UX_AND_PUBLICATION** antes de pilot.

**Acção:** permanecer shadow; amostrar 3+ perfis por tenant piloto.
