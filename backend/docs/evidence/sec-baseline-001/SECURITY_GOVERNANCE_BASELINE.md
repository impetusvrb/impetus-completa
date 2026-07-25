# SECURITY_GOVERNANCE_BASELINE — Governança de Segurança Operacional

**Versão:** 1.0  
**Data:** 2026-07-23  
**Referência:** SEC-BASELINE-001

---

## 1. Fluxo oficial de certificação de novas camadas

Toda nova camada de segurança, ou alteração substancial em camada existente, deve percorrer obrigatoriamente o seguinte fluxo antes de ser considerada operacional:

```
┌─────────────────────────────────────────────────────────┐
│                  IMPLEMENTAÇÃO                          │
│  • Código implementado e habilitado em produção         │
│  • Fonte de telemetria identificada                     │
│  • Dependências documentadas                            │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  OBSERVABILIDADE                        │
│  • Equivalente a SEC-OBS-001                            │
│  • Validar que telemetria existe e é lida correctamente │
│  • Confirmar que estados ATUOU/OBSERVADA/SEM/N/A        │
│    são atribuídos por critérios objectivos              │
│  • Confirmar ausência de estados hardcoded indevidos    │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  COBERTURA                              │
│  • Equivalente a SEC-COVERAGE-001                       │
│  • Mapear todos os critérios de transição               │
│  • Mapear todas as fontes de telemetria                 │
│  • Mapear cobertura de validação                        │
│  • Classificar confiança: HIGH / MEDIUM / LOW           │
│  • Identificar e documentar gaps                        │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  CERTIFICAÇÃO                           │
│  • Equivalente a SEC-CERT-001                           │
│  • Reproduzir transições                                │
│  • Verificar consistência multi-fonte                   │
│  • Testar resiliência (restart, log rotation)           │
│  • Emitir CERTIFIED / CERTIFIED_WITH_LIMITATIONS /      │
│    NOT_CERTIFIED                                        │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  BASELINE                               │
│  • Equivalente a SEC-BASELINE-001                       │
│  • Incorporar ao baseline oficial                       │
│  • Actualizar SECURITY_LAYER_REFERENCE.md               │
│  • Actualizar SECURITY_LIMITATIONS_BASELINE.md          │
│  • Emitir nova versão de SECURITY_OPERATIONAL_BASELINE  │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  PRODUÇÃO                               │
│  • Camada considerada oficialmente operacional          │
│  • Monitorada contra o baseline certificado             │
└─────────────────────────────────────────────────────────┘
```

**Regra absoluta:** Nenhuma camada salta etapas. NOT_CERTIFIED bloqueia promoção para PRODUÇÃO.

---

## 2. Regras de regressão

Toda alteração em camada certificada deve:

| # | Obrigação |
|---|---|
| 1 | Verificar que estados ATUOU/OBSERVADA/SEM_TELEMETRIA/N/A continuam funcionando conforme `SECURITY_LAYER_REFERENCE.md` |
| 2 | Re-executar smoke tests de telemetria da camada afectada |
| 3 | Confirmar consistência multi-fonte (dashboard ↔ intelligence ↔ log real) |
| 4 | Documentar a alteração e seu impacto em evidência rastreada |
| 5 | Não regredir score Phase C abaixo de 0.60 (INV-BL-007) |

Qualquer regressão detectada deve:
- Bloquear a promoção para produção
- Gerar evidência documentada com reprodução do defeito
- Passar pelo fluxo OBS→COVERAGE→CERT antes de re-promoção

---

## 3. Responsabilidades operacionais

| Responsabilidade | Condição de activação |
|---|---|
| Revisão de baseline | Sempre que uma nova camada for adicionada ou uma CERTIFIED regredir |
| Re-certificação de camada | Sempre que o código de `buildProtectionLayers()` for alterado para essa camada |
| Actualização de limitações | Sempre que um gap P1/P2 for aberto ou fechado |
| Score review | Quando score Phase C se afastar mais de 0.10 do baseline (0.64) |
| Re-emissão de certificado | Quando o conjunto de camadas CERTIFIED mudar (nova + ou remoção) |

---

## 4. O que NÃO exige re-certificação

- Patches de texto/evidência que não alteram lógica de estado
- Ajustes de logging que não mudam o critério de transição
- Actualizações de dependências sem impacto em telemetria
- Reinicializações de serviço sem alteração de código

---

## 5. Critérios de promoção por nível de risco

| Tipo de alteração | Mínimo exigido |
|---|---|
| Nova camada de segurança | Fluxo completo OBS→COVERAGE→CERT→BASELINE |
| Alteração de critério ATUOU/OBSERVADA | OBS (verificar telemetria) + re-teste smoke |
| Alteração de fonte de telemetria | OBS + COVERAGE (mapear nova fonte) + smoke |
| Patch textual de evidência | Documentação apenas; sem fluxo de certificação |
| Correção de P0 (estado falso) | OBS + smoke + documentação |

---

## 6. Integração com fluxos existentes

Este processo de governança é complementar (não substitutivo) a:
- Baseline SEC-VISUAL-INTELLIGENCE-001 (INV-SVI) — certificação do pipeline de evidências
- ENT-EXEC-001 — ordem de execução do backlog
- Política de Segurança Arquitectural — proibição de alteração fora do escopo
- ADR-018 — estratégia de backup (fora do painel; governa produto)
