# PLATFORM-2026.1 — Evolution Rules

**Release:** PLATFORM-2026.1  
**Princípio:** FREEZE BEFORE EVOLVE

---

## Regras obrigatórias para novos domínios

| # | Regra | Obrigatória |
|---|-------|-------------|
| 1 | Reutilizar infraestrutura existente | ✓ |
| 2 | Utilizar EOX para apresentação operacional | ✓ |
| 3 | Utilizar registries existentes — sem paralelos | ✓ |
| 4 | Respeitar contratos certificados congelados | ✓ |
| 5 | CPL apenas por adapters — sem engines horizontais | ✓ |
| 6 | Seguir estratégia ARCH-PLAN-001 | ✓ |
| 7 | Proibido criar infraestrutura paralela | ✓ |
| 8 | Declarar estratégia de evolução no programa | ✓ |

---

## Estratégias oficiais

| Estratégia | Objetivo |
|------------|----------|
| **maintenance_only** | Apenas manutenção — preservar baseline |
| **integrate_then_develop** | Integrar existente → depois GREENFIELD scoped |
| **recover_then_expand** | Recuperar ligações → expandir |
| **greenfield** | Domínio novo confirmado na baseline |

Todo novo programa **deve declarar explicitamente** sua estratégia.

---

## Convenção de programas

### Permitido (vertical por domínio)
```
<DOMAIN>-EVOLVE-<NNN>
```

Exemplos: FIN-EVOLVE-001 · SUP-EVOLVE-001 · PPAP-EVOLVE-001 · MSA-EVOLVE-001 · ISH-EVOLVE-001

### Proibido (horizontal)
ARC-004 · CPL-004 · OPM-009 · REG-003 · ENT-002

---

## Implicações práticas

- **Finance:** `integrate_then_develop` — **não** FIN-001 greenfield
- **WMS/Q/S/E:** `maintenance_only` — evolução scoped apenas
- **PPAP/MSA/Ishikawa:** `recover_then_expand` — ligar cockpits existentes
- **Production/HR/Maintenance:** `greenfield` — após pré-requisitos roadmap

---

## Fonte canónica

`frontend/src/platform/release/platformRelease2026Governance.js`
