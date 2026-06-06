# GIT_RECOVERY_LOCAL_CHANGES

**FASE:** GIT-RECOVERY-03 — Etapa 03-B  
**Backup:** `backend/backups/git-recovery-03/`

---

## executiveMode.js

| Versão | Linhas (aprox.) | Notas |
|--------|----------------|-------|
| HEAD | baseline | `ai.chatCompletion` → retorno directo |
| Working tree (pré-restore) | +truth block | `applyCognitiveTextTruth`, channel `executive_ceo_chat` |
| Backup | `executiveMode.js.backup` | Cópia byte-a-byte do WT |

### Diff resumido (HEAD → WT)

- Após `ai.chatCompletion`, envolve resposta em `cognitiveTruthClosureService.applyCognitiveTextTruth`.
- Carrega utilizador da BD para contexto truth.
- `injectOperational: true`, `channel: 'executive_ceo_chat'`.
- Fallback: log `[EXECUTIVE_TRUTH_CLOSURE]` em erro.

**Classificação:** alteração **FASE 47.5 / CEO Truth Closure** — **deve ser reaplicada** após `git checkout`.

---

## impetusVoiceChatService.js

| Versão | Linhas (aprox.) | Notas |
|--------|----------------|-------|
| HEAD | baseline | reply sem truth closure |
| Working tree (pré-restore) | +truth block | Voice Truth Closure |
| Backup | `impetusVoiceChatService.js.backup` | Cópia byte-a-byte do WT |

### Diff resumido (HEAD → WT)

- Após gerar `reply`, chama `applyCognitiveTextTruth` com `channel: 'voice_assistant'`.
- `injectOperational: true`.
- Fallback: log `[VOICE_TRUTH_CLOSURE]`.

**Classificação:** alteração **FASE 47.5 / Voice Truth Closure** — **deve ser reaplicada** após `git checkout`.

---

## Procedimento pós-checkout

```bash
cp backend/backups/git-recovery-03/executiveMode.js.backup backend/src/services/executiveMode.js
cp backend/backups/git-recovery-03/impetusVoiceChatService.js.backup backend/src/services/impetusVoiceChatService.js
```

Sem uso de `impetus_complete/`.
