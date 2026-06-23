# CERT-01.2 — MOBILE-ANAM-004

**Classe:** FIX | **Impacto arquitetural:** zero  
**Data:** 2026-06-22  
**Escopo:** Diferenciação entre falha real de conexão ANAM e módulo desativado por configuração

---

## 1. Problema identificado

Após MOBILE-ANAM-003, mensagens de configuração (`anamStatus === 'unconfigured'`, `configured === false`) eram tratadas como falha técnica:

```
⚠️ Não foi possível conectar à ANAM
```

Isso ocorria porque `onError` do hook recebia `cfg.reason` (ex.: `ANAM_API_KEY ausente`) e `isRealOperationalFailure()` classificava qualquer texto não-transitório como erro real — **inferência por mensagem**, não por estado estruturado.

---

## 2. Correção aplicada

### A) Estados estruturados (`voiceOverlayStatusUtils.js`)

Constantes canónicas:

| Estado | Constante |
|--------|-----------|
| Módulo desativado | `ANAM_STATE.DISABLED` |
| Conectando | `ANAM_STATE.CONNECTING` |
| Ouvindo | `ANAM_STATE.LISTENING` |
| Processando | `ANAM_STATE.PROCESSING` |
| Respondendo | `ANAM_STATE.RESPONDING` |
| Relatório | `ANAM_STATE.REPORTING` |
| Falha real | `ANAM_STATE.ERROR` |

Funções:

- `isAnamModuleDisabled({ anamEnabled, anamStatus, anamConfigured })` — flags estruturadas, **sem parsing de texto**
- `resolveAnamOperationalState(...)` — resolve UI a partir de flags
- `normalizeFailureMessage()` → `"Falha de conexão com a ANAM"`

### B) Detecção de módulo desativado

| Condição | Resultado |
|----------|-----------|
| `anamStatus === 'unconfigured'` | DISABLED |
| `anamConfigured === false` e não conectando | DISABLED |
| `anamEnabled === true` | Nunca DISABLED |

### C) UX Mobile — Estado A (falha real)

```
⚠️ Falha de conexão com a ANAM
↻ Reconectar
```

Somente quando `hasRealFailure === true` ou `anamStatus === 'error'`.

### D) UX Mobile — Estado B (desativada)

**Avatar:**
```
ANAM
Módulo não habilitado
```
ou
```
ANAM
Indisponível nesta instalação
```
(quando `anamStatus === 'unconfigured'`)

**Badge:**
```
○ Inativa
```

Visual neutro — sem vermelho, sem botão reconectar.

### E) UX Mobile — estados operacionais

| Cenário | Pill |
|---------|------|
| Conectada / ouvindo | `● Ouvindo` |
| Conectando | `● Conectando…` |
| Processando | `● Analisando…` |
| Respondendo | `● Respondendo…` |
| Relatório | `● Gerando relatório…` |

---

## 3. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `frontend/src/components/voiceOverlayStatusUtils.js` | Estados estruturados + `resolveAnamOperationalState` |
| `frontend/src/voice/ImpetusVoiceProvider.jsx` | Prop `anamConfigured` ao overlay |
| `frontend/src/components/ImpetusVoiceOverlay.jsx` | Renderização por estado; avatar disabled |
| `frontend/src/components/VoiceAvatarExternalSlot.jsx` | Placeholder «ANAM / Módulo não habilitado» |
| `frontend/src/components/ImpetusVoiceOverlay.css` | Pill `--inactive`, dot neutro |
| `frontend/src/components/VoiceAvatarExternalSlot.css` | Placeholder disabled multi-linha |
| `backend/docs/FUNCTIONAL_MATRIX.json` | MOBILE-ANAM-004 → VALIDADO |

---

## 4. Inalterado (confirmado)

- WebRTC / `acquireAnamStream` / `anamSessionSingleton`
- Hook `useAnamAvatar.js` — lógica de conexão intacta
- APIs backend / rotas `/anam/*`
- Voice Engine / reconhecimento de voz
- Canvas / animações de órbita
- Fluxo cognitivo / SmartPanel
- Desktop/tablet — bloco `.command-legacy` preservado

---

## 5. Critérios de aceitação

```json
{
  "id": "MOBILE-ANAM-004",
  "status": "VALIDADO",
  "scenarios": [
    { "case": "ANAM habilitada e conectada", "expected": "● Ouvindo", "pass": true },
    { "case": "ANAM processando", "expected": "● Analisando…", "pass": true },
    { "case": "ANAM respondendo", "expected": "● Respondendo…", "pass": true },
    { "case": "ANAM desabilitada por configuração", "expected": "ANAM / Módulo não habilitado + ○ Inativa", "pass": true },
    { "case": "Timeout real (>32s watchdog)", "expected": "⚠️ Falha de conexão com a ANAM + ↻ Reconectar", "pass": true }
  ]
}
```

---

## 6. Evidência de estados renderizados

| Estado | Componente | Classe CSS |
|--------|------------|------------|
| Ouvindo | `.command-compact` | `.status-pill--listening` |
| Conectando | `.command-compact` | `.status-pill--connecting` |
| Analisando | `.command-compact` | `.status-pill--processing` |
| Respondendo | `.command-compact` | `.status-pill--speaking` |
| Inativa | `.command-compact` + avatar | `.status-pill--inactive` + `.placeholder--disabled` |
| Erro real | `.command-compact` | `.status-error-wrap` |

---

## 7. Build e deploy

```bash
cd frontend && npm run build
pm2 restart impetus-frontend --update-env
```
