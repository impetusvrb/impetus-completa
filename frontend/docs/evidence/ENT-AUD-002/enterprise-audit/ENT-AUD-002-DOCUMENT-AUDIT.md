# ENT-AUD-002 — Document Audit

## Inventário

- `frontend/docs`: 371 Markdown;
- `frontend/docs/evidence`: 282 Markdown;
- `backend/docs`: 2.793 Markdown;
- total Markdown auditado por descoberta: 3.164;
- artefatos não-Markdown de evidence existem em volume adicional e não devem ser contados como documentos independentes.

## Fontes canônicas atuais

1. `backend/docs/architecture/BASELINE-SYSTEM-v1.4.md`
2. `frontend/docs/platform-release/PLATFORM-2026.1-*`
3. `frontend/docs/evidence/FIN-CERT-001/*`
4. `frontend/docs/evidence/DOMAIN-GOV-001/*`
5. `backend/docs/CERTIFICATIONS-INDEX.md`
6. código canônico em `backend/` e `frontend/`

## Contradições materiais

1. PLATFORM/ARCH-PLAN planeia recuperar PPAP, MSA e Ishikawa, mas SYSTEM v1.4 já os declara LOCKED.
2. ARCH-PLAN usa `SUP-RECOVER-001`; PLATFORM usa `SUP-EVOLVE-001`; a implementação real é GF-021→027/Supply v2.0.
3. ENT-001 marca Finance partial e Maintenance/RH not_started, mas existem workspaces/runtimes posteriores.
4. AIOI de 09/06 afirma que P9 não existe; a auditoria de 11/06 declara P9–P16 certificados.
5. AIOI apresenta ~79%, embora o denominador documentado resulte em 89,0% completo ou 90,9% ponderado.
6. `TECHNICAL_DEBT_MASTER_REPORT` declara 27 débitos e 11 críticos, mas enumera 12 críticos e repete IDs/classificações.
7. `FINAL_STRATEGIC_DEVELOPMENT_ROADMAP` anuncia 36 itens, mas enumera 53.
8. Hardening declara OpenTelemetry pendente apesar de implementação/provisionamento posterior; ativação real continua off.
9. README principal e comentário de `backend/src/server.js` apontam para mirror, enquanto PM2 usa `backend/`.
10. Docs Supply/INC-048 usam “ACTIVE”, mas flags efetivas mantêm os runtimes desativados.

## Documentos obsoletos ou históricos

- BASELINE-SYSTEM v1.0–v1.3;
- BASELINE-QUALITY/LOGISTICS v1.0;
- WMS architecture v0.1;
- FIN-ROADMAP-001;
- README_PRINCIPAL como status de execução;
- roadmaps de maio não reconciliados com certificações de julho;
- AIOI/ICEB antigos quando contradizem fechamento posterior.

## Docs sem implementação correspondente

- Finance ERP/GL/AP-AR/tesouraria/cashflow;
- picking cognitivo completo;
- CRUD industrial de máquinas;
- PagSeguro;
- AIOI Forecast enterprise completo;
- projetos verticais nominalmente aprovados sem implementação pelos IDs.

## Implementação sem documentação suficiente

- semântica simulada de `/api/voz/*`;
- distância aleatória do radar cognitivo;
- cliente de CRUD industrial para rotas 501;
- `CommunicationPanel` sem contrato/consumidor;
- estado efetivo das flags por ambiente.

## Ação

Criar um índice de autoridade com `canonical`, `historical`, `superseded`, `conditional` e `runtime-observed`. Não apagar evidência histórica; impedir que ela seja usada como estado atual.

