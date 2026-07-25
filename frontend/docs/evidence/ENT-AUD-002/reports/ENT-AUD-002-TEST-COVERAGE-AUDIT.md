# ENT-AUD-002 — Test Coverage Audit

## Escala

- 666 scripts nominais nos manifests;
- pelo menos 1.023 ficheiros test-adjacent;
- 115 testes `.mjs` sob `frontend/src/tests`;
- 23 ficheiros adicionais `test/spec` JS/JSX/TS/TSX no frontend;
- 559 ficheiros de teste backend na contagem de descoberta;
- nenhum runner global;
- nenhuma cobertura instrumentada canônica.

## Limitações da contagem

- muitos scripts são aliases;
- alguns scripts executam o mesmo teste;
- snapshots/evidências entram em contagens amplas;
- alguns testes são validações estruturais de strings/imports;
- “E2E”, “HTTP” e “hardware” nem sempre significam browser, socket ou dispositivo real.

## Cobertura relativa

| Área | Situação |
|---|---|
| WMS/OPM | Forte cobertura in-process e de contratos |
| Finance | Forte cobertura estrutural/funcional por programa |
| Quality | Boa cobertura por fases e runtime |
| Environment | Boa cobertura de validation packs |
| AIOI/Security/Event Governance | Alto volume, com certificações estruturais |
| Safety | Baixa cobertura frontend |
| Maintenance/Digital Twin/Production | Sem suites frontend nomeadas |
| Admin Portal | Teste utilitário não registado |
| Lipsync | Sem testes |
| Browser E2E global | Ausente |
| HTTP real global | Ausente |
| Protocolos/hardware real | Não comprovado |

## False signals

- REG-002 chama um teste de “HTTP 200”, mas verifica wiring estático;
- OPM-E2E prova composição in-process;
- hardware-valid usa stubs;
- certificado pode validar arquivos/constantes sem exercitar produção;
- package scripts não medem cobertura de linhas/branches.

## Critério recomendado

Publicar quatro camadas separadas:

1. structural;
2. unit/integration in-process;
3. HTTP/browser;
4. infrastructure/hardware.

Nenhum certificado deve declarar a camada 3 ou 4 sem evidência real reproduzível.

