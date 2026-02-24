/**
 * Fluxo conversacional TPM - interpreta respostas e gera próximas perguntas
 */
const db = require('../db');
const tpmFormService = require('./tpmFormService');

const PROMPTS = {
  date: 'Vou registrar os dados da falha no formulário TPM. Qual a *data* da ocorrência? (ex: 16/02/2025)',
  time: 'Qual a *hora*? (ex: 19:00)',
  equipment: 'Qual *equipamento* e *componente* apresentam falha? (ex: Tetra Pak CBP 32 - sensor empurrador)',
  maintainer: 'Quem efetuou a manutenção? (nome do mecânico)',
  root_cause: 'Qual a causa raiz? Responda: *COMP* (componente), *AJUSTE* ou *OPER* (operacional)',
  frequency: 'Com que *frequência* o problema aparecia? (ex: 2x por dia, toda segunda)',
  failing_part: 'Qual a *peça específica* que está falhando? (ex: sensor S3 do empurrador)',
  corrective_action: 'Qual *ação* foi executada para restabelecer o equipamento?',
  losses_before: 'Quantas *perdas antes* da manutenção? (número)',
  losses_during: 'Quantas *perdas durante* a manutenção? (número)',
  losses_after: 'Quantas *perdas após* liberar o equipamento? (número)',
  operator_name: 'Qual o seu *nome*? (operador responsável)',
  observation: 'Há alguma *observação* a adicionar? (ou digite - para nenhuma)',
  confirm: 'Registro concluído. Confirma o envio? (SIM ou NÃO)'
};

function parseDate(text) {
  const t = (text || '').trim();
  const m = t.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    const d = parseInt(m[1], 10);
    const mon = parseInt(m[2], 10) - 1;
    const y = parseInt(m[3], 10) < 100 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    const dt = new Date(y, mon, d);
    if (!isNaN(dt.getTime())) return dt.toISOString().slice(0, 10);
  }
  if (/hoje|today/i.test(t)) return new Date().toISOString().slice(0, 10);
  if (/ontem|yesterday/i.test(t)) {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function parseTime(text) {
  const t = (text || '').trim();
  const m = t.match(/(\d{1,2})[:\s]?(\d{0,2})/);
  if (m) {
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2] || '0', 10);
    if (h >= 0 && h <= 23 && min >= 0 && min <= 59) {
      return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    }
  }
  return null;
}

function parseRootCause(text) {
  const t = (text || '').trim().toLowerCase();
  if (/comp|componente/i.test(t)) return 'comp';
  if (/ajust/i.test(t)) return 'ajuste';
  if (/oper/i.test(t)) return 'oper';
  return null;
}

function parseNumber(text) {
  const n = parseInt(String(text || '').replace(/\D/g, ''), 10);
  return isNaN(n) ? null : n;
}

function parseValue(step, text) {
  switch (step) {
    case 'date': return parseDate(text);
    case 'time': return parseTime(text);
    case 'root_cause': return parseRootCause(text);
    case 'losses_before':
    case 'losses_during':
    case 'losses_after': return parseNumber(text);
    default: return (text || '').trim() || null;
  }
}

function getDataKey(step) {
  if (step === 'equipment') return { equipment_code: null, component_name: null };
  const map = { date: 'incident_date', time: 'incident_time', maintainer: 'maintainer_name',
    root_cause: 'root_cause', frequency: 'frequency_observation', failing_part: 'failing_part',
    corrective_action: 'corrective_action', losses_before: 'losses_before', losses_during: 'losses_during',
    losses_after: 'losses_after', operator_name: 'operator_name', observation: 'observation' };
  return map[step] ? { [map[step]]: null } : {};
}

async function processMessage(companyId, operatorPhone, text, communicationId = null) {
  let session = await tpmFormService.getActiveSession(companyId, operatorPhone);
  if (!session) {
    const startResult = await tryStartFromOffer(companyId, operatorPhone, text, communicationId);
    if (startResult) return startResult;
    return { handled: false };
  }

  const step = session.current_step;
  const val = parseValue(step, text);

  if (step === 'equipment') {
    const parts = (text || '').split(/-|–|—|\s*,\s*/).map(s => s.trim());
    const eq = parts[0] || text;
    const comp = parts[1] || parts[0] || text;
    await tpmFormService.updateStep(session.id, 'maintainer', { equipment_code: eq, component_name: comp });
    return { handled: true, nextPrompt: PROMPTS.maintainer };
  }

  if (step === 'observation' && (/^-|nenhuma|não|nada$/i.test((text || '').trim()))) {
    await tpmFormService.updateStep(session.id, 'confirm', { observation: '' });
    return { handled: true, nextPrompt: PROMPTS.confirm };
  }

  if (step === 'confirm') {
    if (/sim|s|confirmo|ok/i.test(text || '')) {
      const incident = await tpmFormService.saveIncident(session);
      return { handled: true, completed: true, incident, nextPrompt: '✓ Formulário TPM registrado com sucesso. Os gestores foram notificados.' };
    }
    if (/não|n|cancelar/i.test(text || '')) {
      await db.query('UPDATE tpm_form_sessions SET status = $1 WHERE id = $2', ['cancelled', session.id]);
      return { handled: true, completed: true, cancelled: true, nextPrompt: 'Registro cancelado.' };
    }
    return { handled: true, nextPrompt: 'Responda SIM para confirmar ou NÃO para cancelar.' };
  }

  const key = Object.keys(getDataKey(step))[0] || step;
  if (val === null && (step === 'date' || step === 'time' || step === 'root_cause' || step.startsWith('losses'))) {
    return { handled: true, nextPrompt: `Valor inválido. ${PROMPTS[step]}` };
  }

  const data = key ? { [key]: val } : {};
  const nextIdx = tpmFormService.STEPS.indexOf(step) + 1;
  const nextStep = tpmFormService.STEPS[nextIdx] || 'confirm';

  await tpmFormService.updateStep(session.id, nextStep, data);

  return { handled: true, nextPrompt: PROMPTS[nextStep], session };
}

function getOfferPrompt() {
  return 'Houve *perda ou desperdício* nesta falha? Se sim, responda *SIM* para preencher o formulário TPM.';
}

async function tryStartFromOffer(companyId, operatorPhone, text, communicationId) {
  const t = (text || '').trim().toLowerCase();
  const aceitaForm = /^(sim|s|ok)$/i.test(t) ||
    (t.length <= 40 && /(formul[áa]rio|preencher|quero.*tpm|tpm.*formul[áa]rio)/i.test(t));
  if (!aceitaForm) return null;
  const r = await db.query(`
    SELECT id FROM zapi_sent_messages
    WHERE company_id = $1 AND recipient_phone = $2 AND sent = true
      AND (text_content LIKE $3 OR text_content LIKE $4)
      AND sent_at > now() - interval '15 minutes'
    ORDER BY sent_at DESC LIMIT 1
  `, [companyId, operatorPhone, '%formulário TPM%', '%perda ou desperdício%']);
  if (r.rows.length === 0) return null;
  const session = await tpmFormService.createSession(companyId, operatorPhone, communicationId);
  return { handled: true, session, nextPrompt: PROMPTS.date };
}

module.exports = {
  PROMPTS,
  processMessage,
  getOfferPrompt,
  tryStartFromOffer,
  parseDate,
  parseTime
};
