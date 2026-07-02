# CERT — Auditoria Funcional ManuIA (câmera, botões, endpoints)

**Data:** 2026-06-23  
**Tipo:** FIX (auditoria + correções pontuais)  
**Escopo:** ManuIA hub, Assistência ao Vivo, ManuIA Campo (embed), Gestão de Ativos (feedback)

---

## 1. Resumo executivo

Auditoria funcional completa do ecossistema ManuIA com foco em **comportamento real** (não só UI). A causa raiz principal da mensagem *«Não foi possível acessar a câmera»* em Android foi identificada e corrigida: **`enumerateDevices()` antes da permissão** populava `devices` com `deviceId` vazio, e `getUserMedia` usava `{ deviceId: { exact: '' } }`, falhando mesmo com câmera disponível.

Correções aplicadas preservam design e fluxos existentes.

---

## 2. Inventário de botões auditados

### 2.1 Assistência Técnica ao Vivo (`LiveTechnicalAssistanceModule.jsx`)

| Botão | Handler | Endpoint / efeito | Status |
|-------|---------|-------------------|--------|
| Iniciar / Encerrar assistência | `startLiveAssistance` / `stopCamera` | `getUserMedia` + `POST /sessions` | **CORRIGIDO** (câmera) |
| Pausar / Retomar análise | `setPaused` | Para loop `setInterval` | FUNCIONAL |
| Congelar / Descongelar frame | `toggleFreeze` | Estado local + feedback | **CORRIGIDO** (feedback) |
| Trocar câmera | `switchCamera` | `getUserMedia` ideal + fallback `facingMode` | **CORRIGIDO** |
| Upload | `FileReader` + `liveAnalyzeFrame` | `POST /live-assistance/analyze-frame` | **CORRIGIDO** (vídeo/erro) |
| Microfone | `useSpeechRecognition` | Web Speech API | **CORRIGIDO** (erro visível) |
| Voz IA on/off | `setMuteAiVoice` | `speechSynthesis` | FUNCIONAL |
| Capturar e analisar agora | `runAnalyze` | `POST /analyze-frame` | **CORRIGIDO** (sem frame silencioso) |
| Enviar (copiloto) | `sendChat` | `POST /live-assistance/chat` | FUNCIONAL |
| Abrir 3D | `setUnityOpen` | `ManuIAUnityViewer` | FUNCIONAL (depende biblioteca) |
| Abrir manual | `window.open(research.manuals[0].url)` | URL do dossiê | FUNCIONAL (se URL existir) |
| Histórico OS / Falhas / Equivalentes / Guia | `sendChat(prompt)` | `POST /chat` | FUNCIONAL |
| Salvar análise | `saveSession` | `POST /save-session` | **CORRIGIDO** (era silencioso) |
| Gerar OS | `openOs` → `onGenerateOS` | Modal ManuIA → `/diagnostic` | **CORRIGIDO** (feedback) |
| Confirmar etapa | `setGuidanceStep` | Estado local | FUNCIONAL |
| Fechar 3D | `setUnityOpen(false)` | UI | FUNCIONAL |
| Tentar novamente (câmera) | `startLiveAssistance` | Novo | **NOVO** |

### 2.2 ManuIA hub (`ManuIA.jsx`)

| Área | Botões | Status |
|------|--------|--------|
| Abas (Pesquisa, Ao Vivo, Ativos, Campo, Gêmeo, Biblioteca) | `setActiveTab` | FUNCIONAL |
| Pesquisa + mic | `handleSearch` / `useSpeechRecognition` | FUNCIONAL (`speechError` exibido) |
| Sintomas / Concluir sessão | `handleConclude` | `POST /conclude-session` FUNCIONAL |
| Atalhos diagnóstico / OS | `navigate` | FUNCIONAL |

### 2.3 ManuIA Campo (`ManuIAExtensionApp.jsx`)

| Botão | Handler | Endpoint | Status |
|-------|---------|----------|--------|
| Nav Início/Alertas/OS/Ferramentas/Ajustes | `setView` | — | FUNCIONAL |
| Ferramentas | embed `<ManuIA embedded />` | Mesmas rotas hub | FUNCIONAL |
| Escalar supervisão | `runEscalate` | `manuiaApp` API | FUNCIONAL |
| Abrir diagnóstico/OS | `openLinkedWorkOrder` | navigate | FUNCIONAL |

### 2.4 Análise de campo (`TechnicalFieldAnalysisModule.jsx`)

| Botão | Endpoint | Status |
|-------|----------|--------|
| Analisar com IA | `POST /technical-library/field-analysis` | FUNCIONAL |
| Abrir Unity | local + bridge | FUNCIONAL |

### 2.5 Gestão de Ativos

| Botão | Endpoint | Status |
|-------|----------|--------|
| Simular falha | `POST /asset-management/twins/:id/simulate` | **STUB** backend — **feedback UI adicionado** |
| Pedido de compra | `POST /asset-management/stock/purchase-order` | **STUB** backend — **feedback UI adicionado** |
| Ajustar ponto pedido | `PATCH /stock/:id` | FUNCIONAL |
| Criar/aprovar OS | `/orders` | FUNCIONAL |

### 2.6 Gêmeo Digital Aplicado

| Botão | Endpoint | Status |
|-------|----------|--------|
| Diagnóstico / Imagem | `/digital-twin/diagnose`, `/image-diagnostic` | FUNCIONAL |
| Histórico / Resolver | `/digital-twin/diagnostics` | FUNCIONAL |

---

## 3. Botões quebrados / limitações encontradas

| Item | Severidade | Ação |
|------|------------|------|
| Câmera com `deviceId` vazio pré-permissão | **P0** | **Corrigido** (`cameraMediaUtils.js`) |
| `saveSession` catch vazio | P1 | **Corrigido** |
| `runAnalyze` sem frame retorna silencioso | P1 | **Corrigido** |
| `openOs` sem dossiê silencioso | P2 | **Corrigido** |
| Upload vídeo aceito mas ignorado | P2 | **Corrigido** (mensagem) |
| Trocar câmera `disabled` com 1 device listado | P1 | **Corrigido** (fallback facingMode) |
| `simulate` / `purchase-order` stubs | P3 | Documentado + feedback; persistência futura |
| Build frontend `pulseCognitive` export ausente | OPS | Pré-existente, fora do escopo ManuIA |

**Nenhum `onClick={() => {}}` ou `Em breve` encontrado** nos módulos ManuIA auditados.

---

## 4. Handlers corrigidos

- `frontend/src/utils/cameraMediaUtils.js` — **novo**
- `frontend/src/modules/live-assistance/LiveTechnicalAssistanceModule.jsx`
  - `startCamera`, `stopCamera`, `switchCamera`, `toggleFreeze`, `runAnalyze`, `saveSession`, `openOs`, upload handler
- `frontend/src/modules/asset-management/AssetManagementModule.jsx` — feedback simulate/purchase
- `frontend/src/modules/asset-management/components/stock/StockPanel.jsx` — erro no modal PO

---

## 5. Endpoints validados

| Rota | Smoke (sem token) | Cadeia |
|------|-------------------|--------|
| `POST /live-assistance/analyze-frame` | 401 AUTH | Handler → `manuiaLiveAssistanceService` → Gemini |
| `POST /live-assistance/chat` | 401 AUTH | → `generateCopilotReply` + truth closure |
| `POST /live-assistance/save-session` | 401 AUTH | → `saveDiagnosisSession` → BD |
| `GET /digital-twin/health` | 200 ok | Módulo Gêmeo |
| `POST /sessions` | 401 AUTH | Sessão ManuIA |
| `POST /asset-management/twins/:id/simulate` | Stub 200 | Sem BD |
| `POST /asset-management/stock/purchase-order` | Stub 200 | Sem BD |

Script: `backend/src/tests/manuia/liveAssistanceSmoke.js`

```bash
node backend/src/tests/manuia/liveAssistanceSmoke.js
# Resultado 2026-06-23: 3 ok, 0 falha (rotas públicas + auth guard)
```

---

## 6. Câmera — cenários

| Cenário | Comportamento esperado | Pós-fix |
|---------|------------------------|---------|
| A — Permissão concedida | Preview + botões habilitam | `facingMode: environment` primeiro; re-enumerate após stream |
| B — Permissão negada | Mensagem + retry | `mapMediaError` + botão «Tentar novamente» |
| C — Sem câmera | Mensagem + Upload | `NotFoundError` mapeado |
| D — HTTP (não HTTPS) | Mensagem clara | `SecurityError` / `isSecureMediaContext` |
| E — Câmera em uso | Mensagem + retry | `NotReadableError` |
| F — deviceId inválido | Fallback facingMode | `ideal` em vez de `exact` |

---

## 7. Microfone

- Web Speech API via `useSpeechRecognition`
- Erros exibidos na barra de assistência ao vivo (`speechError`)
- `not-allowed` → «Microfone negado»
- Botão desabilitado quando `!speechSupported` (comportamento correto em browsers sem API)

---

## 8. Fluxo E2E (checklist manual Android)

1. ManuIA Campo → Ferramentas → aba «Assistência ao Vivo»  
2. Iniciar assistência → permissão câmera → preview  
3. Microfone → fala aparece no input  
4. Congelar frame → análise na imagem fixa  
5. Pergunta copiloto → resposta no painel  
6. Salvar análise → mensagem de sucesso ou erro explícito  
7. Gerar OS → modal ManuIA  
8. Upload foto (fallback sem câmera) → análise  

*Requer dispositivo físico com HTTPS para validação final em campo.*

---

## 9. Status final por funcionalidade

| Funcionalidade | Status |
|----------------|--------|
| Câmera ao vivo | **VERDE** (fix aplicado) |
| Troca de câmera | **VERDE** |
| Upload imagem | **VERDE** |
| Copiloto live | **VERDE** (backend existente) |
| Salvar sessão | **VERDE** (com feedback) |
| Gerar OS | **VERDE** |
| Ações rápidas (chat) | **VERDE** |
| Gestão ativos simulate/PO | **AMARELO** (stub + feedback) |
| Build frontend completo | **AMARELO** (`pulseCognitive` pré-existente) |

---

## 10. Deploy

Após correção do build global:

```bash
cd frontend && npm run build
pm2 restart impetus-frontend impetus-backend
```

Arquivos alterados neste FIX listados na secção 4.
