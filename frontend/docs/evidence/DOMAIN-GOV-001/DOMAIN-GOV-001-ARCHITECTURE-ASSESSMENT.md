# DOMAIN-GOV-001 — Architecture Impact Assessment

Toda proposta deve responder:

- altera contratos públicos certificados?
- cria ou duplica motor?
- cria runtime?
- reutiliza capacidades existentes?
- existe adapter possível?
- existe capacidade equivalente?
- altera ownership de dados ou serviço?
- afeta componente certificado?
- exige nova certificação?

## Veredictos

- `CONFORMANT`: reutiliza a baseline sem impacto estrutural.
- `REQUIRE_RECERTIFICATION`: possui valor aprovado, mas altera elemento estrutural.
- `HOLD_REUSE_REQUIRED`: reutilização ainda não demonstrada.
- `REJECT_DUPLICATION`: replica capacidade existente.
- `INCOMPLETE`: respostas ou evidências ausentes.

## Regras

Qualquer alteração de contrato, engine, runtime, ownership ou componente certificado é impacto estrutural. Impacto estrutural não é aprovação automática: exige autoridade arquitetural, plano de compatibilidade, regressão e recertificação explícita.

