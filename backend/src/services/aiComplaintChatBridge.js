'use strict';

const crypto = require('crypto');
const aiComplaintDetectionService = require('./aiComplaintDetectionService');
const aiIncidentService = require('./aiIncidentService');
const aiProviderService = require('./aiProviderService');

async function withProcessingTransparency(user, base) {
  let processing_transparency = null;
  try {
    if (user?.company_id) {
      processing_transparency = await aiProviderService.getProcessingDisclosure(user.company_id, 'chat');
    }
  } catch (_) {
    /* aditivo: não bloquear fluxo de reclamação */
  }
  return { ...base, processing_transparency };
}

/**
 * Resposta unificada a reclamações de qualidade (alucinação, dados incorretos, etc.).
 * @param {object} params
 * @param {object} params.user - req.user
 * @param {string} params.message - texto do utilizador
 * @param {string|null} params.lastAiTraceId - último trace (sessionStorage / corpo)
 * @param {import('express').Response} params.res
 * @param {'dashboard'|'cognitive'} [params.format='dashboard'] - cognitive inclui result/synthesis para ChatApp
 * @param {string} [params.assistantSummary] - resumo da última resposta da IA
 * @param {string} [params.dataStateHint] - data_state atual do tenant
 * @param {string} [params.lastTraceCreatedAt] - timestamp de criação do último trace
 * @returns {Promise<boolean>} true se a resposta HTTP já foi enviada
 */
async function respondIfQualityComplaint({ user, message, lastAiTraceId, res, format = 'dashboard', assistantSummary, dataStateHint, lastTraceCreatedAt }) {
  const u = user;
  if (!u?.company_id) return false;

  let lastTrace = lastAiTraceId != null ? String(lastAiTraceId).trim() : null;
  if (lastTrace === '') lastTrace = null;

  const text = String(message || '').trim();
  if (!text) return false;

  try {
    const complaint = await aiComplaintDetectionService.evaluateComplaint(text, {
      assistantSummary,
      dataStateHint,
      lastAiTraceId: lastTrace,
      lastTraceCreatedAt
    });
    if (!complaint.is_complaint) return false;

    const wrap = async (base) => {
      const withPt = await withProcessingTransparency(u, base);
      if (format !== 'cognitive') return withPt;
      const content = withPt.reply || withPt.message || withPt.content || '';
      const expl = withPt.explanation_layer;
      return {
        ...withPt,
        result: { content, explanation_layer: expl },
        synthesis: { content, explanation_layer: expl }
      };
    };

    if (complaint.requires_hitl) {
      const hitlToken = crypto.randomUUID();
      const confirmMsg = 'Parece que pretende reportar um problema com a resposta anterior. Confirma que está a reportar uma resposta incorreta da IA?';
      res.json(
        await wrap({
          ok: true,
          kind: 'complaint_confirmation_request',
          hitl_token: hitlToken,
          original_message: text,
          reply: confirmMsg,
          message: confirmMsg,
          content: confirmMsg,
          incident_reported: false,
          explanation_layer: {
            facts_used: ['Pedido de confirmação HITL antes de registar incidente.'],
            business_rules: ['Em caso de dúvida (tenant vazio ou sem contexto do assistente), solicitar confirmação humana.'],
            confidence_score: 100,
            limitations: ['Incidente só será criado após confirmação explícita do utilizador.'],
            reasoning_trace: 'Gate HITL activado — aguardar confirmação.',
            data_lineage: []
          }
        })
      );
      return true;
    }

    const traceForIncident = await aiIncidentService.resolveTraceIdForComplaint({
      companyId: u.company_id,
      userId: u.id,
      preferredTraceId: lastTrace
    });

    if (traceForIncident) {
      const severity = dataStateHint === 'tenant_empty'
        ? 'LOW'
        : aiIncidentService.severityForType(complaint.incident_type);

      let incident;
      try {
        incident = await aiIncidentService.createIncident({
          traceId: traceForIncident,
          userId: u.id,
          companyId: u.company_id,
          incidentType: complaint.incident_type,
          userComment: text,
          severity,
          metadata: {
            assistant_summary_snapshot: assistantSummary || null,
            data_state_at_complaint: dataStateHint || null
          }
        });
      } catch (err) {
        console.error('[COMPLAINT_CREATE]', err);
        const failMsg = `Detetámos uma reclamação sobre a resposta da IA, mas não foi possível registar o incidente de qualidade neste momento. Por favor contacte o administrador ou o suporte IMPETUS. (${err?.code || err?.message || 'erro'})`;
        res.json(
          await wrap({
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
        await wrap({
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
      await wrap({
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
