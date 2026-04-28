# Archive do frontend

## Propósito

Este diretório guarda **cópias de leitura** de ficheiros que foram **removidos da árvore ativa** (`frontend/src/`), tipicamente após limpeza de código morto ou refactors. Não é código executado pela aplicação: serve de **referência**, auditoria e recuperação pontual.

Cada remoção organizada deve ficar numa subpasta datada, por exemplo:

`codigo-morto-removido-AAAA-MM-DD/`

Dentro dela, reproduz-se a estrutura relativa a `src/` (ex.: `.../src/hooks/...`) para facilitar comparações e cópias.

## Como restaurar ficheiros

1. **Copiar de volta para `frontend/src/`** (ajustando o caminho):
   ```bash
   # Exemplo: restaurar um hook
   cp archive/codigo-morto-removido-2026-03-27/src/hooks/useImpetusVoiceAssistant.js \
      ../src/hooks/
   ```
2. **Rever imports e rotas** — o código pode estar desalinhado com o `main` atual; é necessário garantir que todos os consumidores existem e que o build (`npm run build`) passa.
3. **Alternativa via Git** — se o ficheiro ainda existir no histórico:
   ```bash
   git show HEAD:frontend/src/caminho/do/ficheiro.jsx > ../src/caminho/do/ficheiro.jsx
   ```

## Regras de uso

- **Não importar** módulos de `archive/` na app (Vite/webpack não deve resolver este diretório como fonte de produção).
- **Só entram** cópias **intencionais** após decisão explícita (ex.: código morto removido com backup).
- **Evitar** arquivar binários pesados ou `node_modules`; manter o archive **pequeno e legível**.
- **Não substituir** o Git: o archive complementa o histórico quando convém ter a árvore espelhada em disco.
- Novos lotes: criar nova pasta `*-removido-AAAA-MM-DD` em vez de sobrescrever lotes antigos.

## Versionamento

**Este diretório deve permanecer versionado no Git** (junto com este `README.md`), para que a equipa partilhe o mesmo significado do arquivo e as mesmas referências. Apenas em cenários excecionais (ex.: dumps enormes e temporários) se pode avaliar `.gitignore` local — não é o caso padrão.
