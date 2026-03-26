# ManuIA — Unity WebGL

## Checklist de deploy

1. No Unity Editor, **Product Name** = **ManuIAViewer** (ou altere `UNITY_BUILD_NAME` em `frontend/src/config/viewerAssetsConfig.js` para coincidir com o prefixo dos ficheiros em `Build/`).
2. **File → Build Settings → WebGL → Build** (escolha uma pasta de saída).
3. Copie para **`frontend/public/unity/manu-ia-viewer/`**:
   - Toda a pasta **`Build/`** (contém `ManuIAViewer.loader.js`, `.data`, `.framework.js`, `.wasm` ou equivalentes).
   - Opcional: **`StreamingAssets/`** ao mesmo nível que `Build/`.
4. Confirme no browser:  
   `https://<seu-dominio>/<base>/unity/manu-ia-viewer/Build/<UNITY_BUILD_NAME>.loader.js` → **200**.

## Integração com o React

- O componente `ManuIAUnityViewer` carrega `createUnityInstance` a partir do `.loader.js`.
- Comandos: `SendMessage("MachineController", método, argumento)` — ver `unity/MachineController.cs.example` na raiz do repositório.
- **IA (Claude)** no Diagnóstico 3D: o hook `useVisionChat` chama `applyVisualIntentsFromClaudePayload` após cada resposta; intenções opcionais vêm no JSON como `visualIntents` ou nos campos legados (`highlight`, `explode`, etc.).

## Sem build no servidor

O ManuIA mostra o **fallback** com instruções; `unityBridge` e `routeAIVisualIntent` continuam a aceitar comandos (fila até o Unity estar pronto).

## MIME e compressão

Em produção, o servidor deve servir `.wasm` com `application/wasm` e permitir **gzip/brotli** dos ficheiros grandes (configuração típica Nginx/CloudFront).
