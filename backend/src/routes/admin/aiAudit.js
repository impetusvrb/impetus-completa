'use strict';

/**
 * Auditoria de interações IA — apenas administradores da empresa.
 */
const express = require('express');
const router = express.Router();
const { requireAuth, requireRole, requireCompanyId } = require('../../middleware/auth');
const aiAnalytics = require('../../services/aiAnalyticsService');
const dataLineageService = require('../../services/dataLineageService');

const adminCompany = [requireAuth, requireRole('admin'), requireCompanyId];

function parseInputPayloadObject(inputPayload) {
  if (inputPayload == null) return {};
  if (typeof inputPayload === 'object' && !Array.isArray(inputPayload)) return inputPayload;
  if (typeof inputPayload === 'string') {
    try {
      const o = JSON.parse(inputPayload);
      return typeof o === 'object' && o !== null && !Array.isArray(o) ? o : {};
    } catch {
      return {};
    }
  }
  return {};
}

/** Linhagem normalizada a partir de input_payload (auditoria / compliance). */
function extractDataLineageFromPayload(inputPayload) {
  const p = parseInputPayloadObject(inputPayload);
  const raw = p.data_lineage;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => dataLineageService.normalizeDataLineageItem(x))
    .filter(Boolean);
}

function formatTraceRow(row) {
  const pretty = (v) => {
    if (v == null) return null;
    if (typeof v === 'object') return v;
    return v;
  };
  const data_lineage = extractDataLineageFromPayload(row.input_payload);
  const hv = row.human_validation_status || null;
  const mod = row.validation_modality || null;
  const ev = row.validation_evidence || null;
  const vat = row.validated_at || null;
  let humanLine = null;
  if (hv === 'PENDING') {
    humanLine = 'Aguardando validação orgânica (texto, voz ou gesto).';
  } else if (hv === 'SUPERSEDED') {
    humanLine = 'Substituído por uma sugestão mais recente (novo trace).';
  } else if (hv === 'ACCEPTED' || hv === 'REJECTED' || hv === 'ADJUSTED') {
    const modLabel =
      mod === 'VOICE' ? 'Áudio' : mod === 'VIDEO' ? 'Vídeo/gesto' : mod === 'TEXT' ? 'Texto' : mod || '—';
    humanLine = `Validado pelo humano (${hv}) via ${modLabel}${vat ? ` em ${vat}` : ''}`;
    if (ev) humanLine += `. Prova: «${String(ev).slice(0, 280)}${String(ev).length > 280 ? '…' : ''}»`;
  } else if (hv == null) {
    humanLine = 'Validação humana não aplicável a este registo.';
  }
  return {
    id: row.id,
    trace_id: row.trace_id,
    created_at: row.created_at,
    module_name: row.module_name,
    user: row.user_id
      ? {
          id: row.user_id,
          name: row.user_name,
          email: row.user_email
        }
      : null,
    input_payload: pretty(row.input_payload),
    /** Cópia normalizada para o painel admin (entidade, origem, frescura, fiabilidade). */
    data_lineage,
    output_response: pretty(row.output_response),
    model_info: pretty(row.model_info),
    system_fingerprint: row.system_fingerprint,
    human_validation_status: hv,
    validation_modality: mod,
    validation_evidence: ev,
    validated_at: vat,
    validation_audit: pretty(row.validation_audit),
    /** Campos derivados para leitura rápida no painel */
    summary: {
      module: row.module_name,
      trace_id: row.trace_id,
      created_at: row.created_at,
      human_validation: humanLine,
      data_lineage_count: data_lineage.length,
      data_lineage_entities: data_lineage.slice(0, 6).map((d) => d.entity),
      ai_vs_human:
        hv === 'ACCEPTED' || hv === 'ADJUSTED'
          ? 'Sugestão da IA validada pelo humano (conversa contínua).'
          : hv === 'REJECTED'
            ? 'Sugestão da IA recusada pelo humano (registado).'
            : hv === 'PENDING'
              ? 'Sugestão gerada — confirmação humana ainda pendente.'
              : hv === 'SUPERSEDED'
                ? 'Ciclo anterior substituído.'
                : 'Interação registada (sem ciclo HITL obrigatório).'
    }
  };
}

async function handleListAiTraces(req, res) {
  try {
    const limit = req.query.limit;
    const rows = await aiAnalytics.listTracesForCompany(req.user.company_id, limit);
    res.json({
      success: true,
      data: {
        items: rows.map(formatTraceRow),
        count: rows.length
      }
    });
  } catch (err) {
    console.error('[AI_AUDIT_LIST]', err);
    res.status(500).json({
      success: false,
      error: err?.message || 'Erro ao listar auditoria de IA.'
    });
  }
}

/** Reutilizado em `logs.js` como GET /api/admin/logs/ai-traces (registo explícito, sem sub-router). */
const listAiTracesHandlers = [...adminCompany, handleListAiTraces];

router.get('/', ...listAiTracesHandlers);
router.listAiTracesHandlersForMountOnLogs = listAiTracesHandlers;

module.exports = router;
