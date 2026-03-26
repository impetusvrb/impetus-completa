# ManuIA — Unity WebGL

1. No Unity Editor, abra o projeto do viewer (product name recomendado: **ManuIAViewer**).
2. **File → Build Settings → WebGL → Build** (ou pasta `Build`).
3. Copie o conteúdo gerado para:
   - `frontend/public/unity/manu-ia-viewer/`
   - Deve existir `Build/ManuIAViewer.loader.js` (ou ajuste `UNITY_BUILD_NAME` em `src/config/viewerAssetsConfig.js`).
4. Opcional: pasta `StreamingAssets` ao mesmo nível do `Build`.
5. O React carrega `createUnityInstance` a partir do `.loader.js` e envia comandos via `SendMessage` para o GameObject **`MachineController`** (ver `unity/MachineController.cs.example` na raiz do repositório).

Sem esta pasta, o ManuIA mostra o painel de fallback; a ponte JS continua preparada para quando o build existir.
