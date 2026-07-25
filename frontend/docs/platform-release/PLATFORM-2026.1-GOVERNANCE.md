# PLATFORM-2026.1 — Governance

**Release:** PLATFORM-2026.1

---

## Governança de alterações estruturais

Qualquer alteração em programas congelados exige **todos** os critérios:

| Critério | Obrigatório |
|----------|-------------|
| Justificativa técnica documentada | ✓ |
| Análise de impacto cross-domain | ✓ |
| Aprovação arquitetural formal | ✓ |
| Plano de rollback | ✓ |
| Nova certificação do programa afectado | ✓ |

---

## Alterações permitidas sem processo extraordinário

- Correcções críticas de produção
- Patches de segurança
- Compatibilidade obrigatória (breaking external dependency)

---

## Decisão arquitetural extraordinária

Necessária para:

- Reabrir programas horizontais (OPM-009, CPL-004, REG-003, etc.)
- Modificar contratos congelados OPM-GOV / CPL-001
- Criar registries paralelos
- Criar engines ou runtimes horizontais novos

---

## Papéis e responsabilidades pós-release

| Papel | Responsabilidade |
|-------|------------------|
| Arquitectura | Aprovar programas *-EVOLVE-* e mudanças estruturais |
| Domínio | Executar evolução vertical dentro da estratégia ARCH-PLAN |
| Plataforma | Manutenção only em programas congelados |
| Audit/Knowledge | Artefactos read-only — sem novos programas ENT/REG salvo incidente |

---

## Camadas read-only da release

| Camada | Path | Mutável |
|--------|------|---------|
| ENT-001 | platform/knowledge/ | Não (frozen) |
| ARCH-PLAN-001 | platform/planning/ | Não (frozen) |
| PLATFORM-2026.1 | platform/release/ | Não (frozen) |

Nova release futura: PLATFORM-2026.2+ apenas com ciclo completo de certificação.

---

## Validação contínua

```bash
npm run test:platform-2026
```

Deve manter `validatePlatformRelease2026Integrity().valid === true`.

---

## Fonte canónica

`frontend/src/platform/release/platformRelease2026Governance.js`
