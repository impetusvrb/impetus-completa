# ENT-AUD-002 — Executive Summary

**Princípio:** `AUDIT BEFORE BUILD`  
**Data:** 2026-07-21  
**Modo:** READ ONLY  
**Estado:** AUDIT COMPLETE — execution closure required

## Parecer executivo

O IMPETUS possui uma arquitetura extensa e várias baselines formalmente certificadas, mas o estado de execução não pode ser resumido como “plataforma concluída”. A baseline arquitetural é mais madura do que a operação real.

Nenhum novo domínio deve ser aberto antes do encerramento dos itens P0/P1 do `ENT-AUD-002-MASTER-BACKLOG.md`.

## Escala observada

- 3.164 documentos Markdown: 371 no frontend e 2.793 no backend;
- 99 declarações de rota React;
- 303 ficheiros de routers e aproximadamente 291 mounts backend;
- 944 ficheiros de serviços backend;
- 11 runtimes cognitivos homologados no inventário oficial;
- 666 scripts nominais de teste;
- pelo menos 1.023 ficheiros test-adjacent;
- nenhum runner global, cobertura instrumentada ou OpenAPI canônico.

Contagens por ficheiro não representam processos, runtimes ou testes independentes.

## O que está consolidado

- PLATFORM-2026.1 e BASELINE-SYSTEM v1.4;
- ARC, NAV, EOX, WMS/OPM, CPL, REG, ENT e ARCH-PLAN;
- Supply/WMS v2.0;
- Finance completo até `CERT-FINANCE-DOMAIN-001`;
- Prediction Platform certificada, com energia fora da cobertura inicial;
- DOMAIN-GOV-001;
- Security/Event Governance/ECO com ressalvas documentadas.

## Findings que impedem nova expansão

### Integridade operacional

1. `/api/voz/alertas` e `/api/voz/comando` fabricam factos operacionais.
2. O workspace Logistics apresenta KPIs fixos quando a API falha.
3. `InsightsList` apresenta riscos fictícios quando não existem dados.

### Operação e segurança

- 483 reinícios acumulados no PM2 observado;
- drift `NODE_ENV=development` no control-plane versus `.env` production;
- pressão recorrente no pool PostgreSQL;
- segredo sensível visível via diagnóstico PM2;
- bootstrap SEC-05 com erro absorvido;
- STAGING pendente, ROLLBACK reprovado, VALIDATION não homologada.

### Governança e prova

- roadmaps antigos contradizem baselines de julho;
- 666 scripts não correspondem a 666 suítes;
- certificações frequentemente provam estrutura in-process, não browser/HTTP/hardware real;
- Supply/INC-048/WMS documentados como homologados, mas flags efetivas permanecem fail-closed;
- não existe catálogo único de APIs, owners, consumidores e estado runtime.

## Decisão

Prioridade imediata: remover dados fictícios de superfícies ativas, estabilizar operação, fechar homologação e criar fontes de verdade reproduzíveis para APIs/testes/documentação.

Projetos, novos motores, novos runtimes e novos domínios devem esperar.

