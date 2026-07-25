# OPM-GOV-001 — Operational Invariants

| ID | Módulo | Regra |
|----|--------|-------|
| INV-RCV-001 | receiving | Não concluir sem movimento receipt |
| INV-PCK-001 | picking | Não concluir sem estoque disponível |
| INV-PCK-002 | picking | Conclusão gera movement pick |
| INV-SHP-001 | shipping | Não iniciar sem Picking concluído |
| INV-SHP-002 | shipping | Expedição gera movement issue |
| INV-INV-001 | inventory | issue exige pick prévio na sequência E2E |
| INV-INV-002 | inventory | Movimentos não órfãos |
| INV-TML-001 | timeline | Eventos cronológicos |
| INV-OBS-001 | observability | Mudança operacional → evento |
| INV-MOV-001 | movements | Sequência receipt → pick → issue |

Fonte: `opmGov001OperationalInvariants.js`  
Certificado por: OPM-E2E-001
