'use strict';

const INTENT_MAP = [
  { intent: 'send_communication', re: /(envi[ae]|enviar|despache|comunicado|aviso|notific)/i },
  { intent: 'create_tracking_list', re: /(lista|confirmac[aã]o|presen[cç]a)/i },
  { intent: 'plan_training', re: /(treinamento|capacita|nr-?\d+)/i },
  { intent: 'incident_response', re: /(incidente|acidente|emergencia|evacuacao)/i },
  { intent: 'report_request', re: /(relatorio|report|consolida[rc]|resumo)/i },
  { intent: 'workflow_continue', re: /(continue|continuar|prosseguir|fechar|finalizar)/i },
  { intent: 'data_query', re: /(quanto|qual|onde|status|estado)/i }
];

function inferOperationalIntent(text = '') {
  const intents = [];
  for (const { intent, re } of INTENT_MAP) if (re.test(String(text || ''))) intents.push(intent);
  return {
    primary: intents[0] || 'generic',
    all: intents,
    confidence: intents.length ? Number(Math.min(1, 0.4 + intents.length * 0.15).toFixed(3)) : 0.2
  };
}

module.exports = { inferOperationalIntent };
