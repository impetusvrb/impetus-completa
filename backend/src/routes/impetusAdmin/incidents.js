'use strict';

const express = require('express');
const router = express.Router();
const db = require('../../db');
const { requireAdminAuth } = require('../../middleware/adminPortalAuth');
const { logAdminAction } = require('../../services/adminPortalLogService');
const aiIncidentService = require('../../services/aiIncidentService');
const unifiedMessagingService = require('../../services/unifiedMessagingService');

/** Perfis do portal IMPETUS com visão global de incidentes. */
function requireGlobalIncidentsAccess(req, res, next) {
  const p = req.adminUser?.perfil;
  if (['super_admin', 'admin_comercial', 'admin_suporte'].includes(p)) return next();
  return res.status(403).json({ ok: false, error: 'Permissão insuficiente', code: 'ADMIN_FORBIDDEN' });
}

router.get('/stats', requireAdminAuth, requireGlobalIncidentsAccess, async (req, res) => {
  try {
    const companyId = req.query.company_id ? String(req.query.company_id).trim() : null;
    let validCompany = null;
    if (companyId) {
      const c = await db.query(`SELECT id FROM companies WHERE id = $1::uuid LIMIT 1`, [companyId]);
      if (c.rows[0]) validCompany = companyId;
    }
    const days = req.query.days;
    const data = await aiIncidentService.statsWeekly({
      companyId: validCompany,
      days
    });
    res.json({ ok: true, data });
  } catch (e) {
    console.error('[IMPETUS_ADMIN_INCIDENTS_STATS]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter estatísticas' });
  }
});

router.get('/', requireAdminAuth, requireGlobalIncidentsAccess, async (req, res) => {
  try {
    const companyId = req.query.company_id ? String(req.query.company_id).trim() : null;
    let filter = null;
    if (companyId) {
      const c = await db.query(`SELECT id FROM companies WHERE id = $1::uuid LIMIT 1`, [companyId]);
      if (c.rows[0]) filter = companyId;
    }
    const items = await aiIncidentService.listGlobal(req.query.limit, filter);
    res.json({ ok: true, data: { items, count: items.length } });
  } catch (e) {
    console.error('[IMPETUS_ADMIN_INCIDENTS_LIST]', e);
    res.status(500).json({ ok: false, error: 'Erro ao listar incidentes' });
  }
});

router.get('/:id', requireAdminAuth, requireGlobalIncidentsAccess, async (req, res) => {
  try {
    const row = await aiIncidentService.getByIdGlobal(req.params.id);
    if (!row) {
      return res.status(404).json({ ok: false, error: 'Incidente não encontrado' });
    }
    const trace_snapshot = await aiIncidentService.fetchTraceSnapshotGlobal(row.trace_id);
    res.json({ ok: true, data: { incident: row, trace_snapshot } });
  } catch (e) {
    console.error('[IMPETUS_ADMIN_INCIDENTS_GET]', e);
    res.status(500).json({ ok: false, error: 'Erro ao obter incidente' });
  }
});

router.patch('/:id', requireAdminAuth, requireGlobalIncidentsAccess, async (req, res) => {
  try {
    const { status, resolution_note } = req.body || {};
    const result = await aiIncidentService.updateByImpetusAdmin(req.params.id, { status, resolution_note }, req.adminUser.id);
    if (!result) {
      return res.status(404).json({ ok: false, error: 'Incidente não encontrado' });
    }
    const { previous, current } = result;
    await logAdminAction({
      adminUserId: req.adminUser.id,
      acao: 'ai_incident_update',
      entidade: 'ai_incidents',
      entidadeId: current.id,
      detalhes: { status: current.status, trace_id: current.trace_id },
      ip: req.ip
    });
    const wasOpen = !['RESOLVED', 'FALSE_POSITIVE'].includes(previous.status);
    const isClosed = ['RESOLVED', 'FALSE_POSITIVE'].includes(current.status);
    if (wasOpen && isClosed && previous.user_id && previous.company_id) {
      const msg =
        current.status === 'FALSE_POSITIVE'
          ? 'O seu relatório sobre a IA foi analisado pela equipa IMPETUS (falso positivo). Agradecemos o contacto.'
          : 'O incidente de qualidade da IA que reportou foi marcado como resolvido pela equipa IMPETUS. O modelo e a linhagem dos dados foram analisados; obrigado por ajudar a melhorar o sistema.';
      await unifiedMessagingService.sendToUser(previous.company_id, previous.user_id, msg, {});
    }
    res.json({ ok: true, data: { incident: current } });
  } catch (err) {
    if (err.code === 'INVALID_STATUS') {
      return res.status(400).json({ ok: false, error: err.message });
    }
    console.error('[IMPETUS_ADMIN_INCIDENTS_PATCH]', err);
    res.status(500).json({ ok: false, error: err?.message || 'Erro ao atualizar' });
  }
});

module.exports = router;
