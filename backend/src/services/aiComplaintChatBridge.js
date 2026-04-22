'use strict';

const aiComplaintDetectionService = require('./aiComplaintDetectionService');
const aiIncidentService = require('./aiIncidentService');

/**
 * Resposta unificada a reclamações de qualidade (alucinação, dados incorretos, etc.).
 * @param {object} params
 * @param {object} params.user - req.user
 * @param {string} params.message - texto do utilizador
 * @param {string|null} params.lastAiTraceId - último trace (sessionStorage / corpo)
 * @param {import('express').Response} params.res
 * @param {'dashboard'|'cognitive'} [params.format='dashboard'] - cognitive inclui result/synthesis para ChatApp
 * @returns {Promise<boolean>} true se a resposta HTTP já foi enviada
 */
async function respondIfQualityComplaint({ user, message, lastAiTraceId, res, format = 'dashboard' }) {
  const u = user;
  if (!u?.company_id) return false;

  let lastTrace = lastAiTraceId != null ? String(lastAiTraceId).trim() : null;
  if (lastTrace === '') lastTrace = null;

  const text = String(message || '').trim();
  if (!text) return false;

  try {
    const complaint = await aiComplaintDetectionService.evaluateComplaint(text);
    if (!complaint.is_complaint) return false;

    const traceForIncident = await aiIncidentService.resolveTraceIdForComplaint({
      companyId: u.company_id,
      userId: u.id,
      preferredTraceId: lastTrace
    });

    const wrap = (base) => {
      if (format !== 'cognitive') return base;
      const content = base.reply || base.message || base.content || '';
      const expl = base.explanation_layer;
      return {
        ...base,
        result: { content, explanation_layer: expl },
        synthesis: { content, explanation_layer: expl }
      };
    };

    if (traceForIncident) {
      let incident;
      try {
        incident = await aiIncidentService.createIncident({
          traceId: traceForIncident,
          userId: u.id,
          companyId: u.company_id,
          incidentType: complaint.incident_type,
          userComment: text,
          severity: aiIncidentService.severityForType(complaint.incident_type)
        });
      } catch (err) {
        console.error('[COMPLAINT_CREATE]', err);
        const failMsg = `Detetámos uma reclamação sobre a resposta da IA, mas não foi possível registar o incidente de qualidade neste momento. Por favor contacte o administrador ou o suporte IMPETUS. (${err?.code || err?.message || 'erro'})`;
        res.json(
          wrap({
            ok: true,
            reply: failMsg,
            message: failMsg,
            content: failMsg,
            incident_reported: false,
            incident_create_error: true,
            explanation_layer: {
              facts_used: ['Falha ao persistir incidente (verificar migração ai_incidents).'],
              business_rules: ['Tente novamente após o administrador executar migrações da base de dados.'],
              confidence_score: 100,
              limitations: [],
              reasoning_trace: String(err?.message || '').slice(0, 500),
              data_lineage: []
            }
          })
        );
        return true;
      }

      const shortId = String(incident.id).replace(/-/g, '').slice(0, 8).toUpperCase();
      const reply = `Sinto muito pelo erro. Registrei um incidente de qualidade (ID: ${shortId}) para a nossa equipa técnica analisar a origem desse dado.`;
      res.json(
        wrap({
          ok: true,
          reply,
          message: reply,
          content: reply,
          incident_reported: true,
          incident_id: incident.id,
          incident_ref: shortId,
          linked_trace_id: traceForIncident,
          explanation_layer: {
            facts_used: ['Reporte conversacional de qualidade (reclamação sobre resposta da IA).'],
            business_rules: [
              'IMPETUS — Incidente aberto com vínculo ao trace da caixa-preta para análise de linhagem.'
            ],
            confidence_score: 100,
            limitations: ['Mensagem automática de confirmação; não gera nova inferência de modelo.'],
            reasoning_trace:
              'Pedido classificado como reclamação de qualidade; incidente registado com trace_id para auditoria.',
            data_lineage: []
          }
        })
      );
      return true;
    }

    const soft = `Não encontrei o rastreio da última resposta da IA para associar ao relatório. Interaja novamente com o assistente e volte a sinalizar, ou contacte o administrador.`;
    res.json(
      wrap({
        ok: true,
        reply: soft,
        message: soft,
        content: soft,
        incident_reported: false,
        incident_trace_missing: true,
        explanation_layer: {
          facts_used: ['Tentativa de reporte sem trace correspondente na caixa-preta.'],
          business_rules: ['É necessário um trace_id válido para auditoria completa.'],
          confidence_score: 100,
          limitations: [],
          reasoning_trace: 'Nenhum trace recente encontrado para a empresa/utilizador.',
          data_lineage: []
        }
      })
    );
    return true;
  } catch (e) {
    console.warn('[QUALITY_COMPLAINT_BRIDGE]', e?.message);
    return false;
  }
}

module.exports = {
  respondIfQualityComplaint
};
