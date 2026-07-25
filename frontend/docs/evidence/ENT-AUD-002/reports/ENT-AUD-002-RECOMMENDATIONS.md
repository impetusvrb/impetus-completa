# ENT-AUD-002 — Recommendations

## Fazer imediatamente

1. Remover dados fictícios de Voz, Logistics, Insights e Safety.
2. Rotacionar segredos e limitar diagnóstico PM2.
3. Alinhar PM2/ambiente e estabilizar PostgreSQL.
4. Corrigir bootstrap SEC-05.
5. Fechar STAGING, ROLLBACK, VALIDATION e GOLIVE com evidência.
6. Criar runner global, cobertura real e matriz `programa → teste efetivo`.
7. Criar catálogo canônico de APIs/mounts/owners/consumidores.

## Consolidar

- autoridade documental e status `canonical/superseded`;
- conceito `implemented/mounted/enabled/running`;
- publicação e flags de Supply, Q/S/E/L;
- dual stack WMS;
- observabilidade frontend/backend com sink e retenção;
- ADR para Prediction Finance client-side;
- inventário de rotas, guards e deep-links.

## Fazer depois

- cobertura histórica energética;
- AIOI pilot e rollout governado;
- activation de Supply;
- hardware loop para protocolos/Environment;
- Business Cases para Production, HR, Procurement ou Projects.

## Arquivar

- baselines v1.0–v1.3;
- FIN-ROADMAP-001;
- README principal como status;
- roadmaps de maio após migração dos itens válidos;
- placeholders verticais já atendidos por baselines certificadas.

## Nunca implementar

- dados sintéticos apresentados como factos reais;
- motores preditivos por domínio quando existe plataforma horizontal;
- decisão/execução autônoma sem HITL e governança;
- duplicação de Twin, WMS, observabilidade ou runtime cognitivo;
- ativação por documentação sem evidência de ambiente;
- novo domínio apenas por oportunidade técnica.

## Gate para novo domínio

Abrir somente quando:

- P0 concluído;
- estabilidade operacional observada;
- homologação fechada;
- testes e APIs possuírem fontes de verdade;
- Business Case aprovado;
- reuse checklist e architecture impact assessment completos.

