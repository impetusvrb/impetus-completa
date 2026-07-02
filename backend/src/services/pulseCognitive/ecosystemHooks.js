/**
 * CERT-PULSE-03 FASE 1 — Hooks silenciosos por domínio do ecossistema IMPETUS.
 * Fire-and-forget; falhas nunca interrompem o fluxo principal.
 */
'use strict';

const { notifyHumanEvent, enabled } = require('./hooks');

function safe(domain, companyId, event) {
  if (!enabled() || !companyId) return;
  try {
    notifyHumanEvent(companyId, {
      ...event,
      event_source: event.event_source || domain,
      payload: { ...(event.payload || {}), domain }
    });
  } catch (_) {
    /* nunca propagar */
  }
}

function fromUser(reqOrUser, fallback = {}) {
  const u = reqOrUser?.user || reqOrUser || {};
  return {
    user_id: u.id || fallback.user_id || null,
    operational_team_member_id:
      u.active_operational_team_member_id || fallback.operational_team_member_id || null,
    collective_user_id: u.id || null
  };
}

const ecosystemHooks = {
  tpmRecorded(companyId, userId, meta = {}) {
    safe('tpm', companyId, {
      user_id: userId,
      event_type: 'tpm_recorded',
      payload: meta
    });
  },
  proacaoSubmitted(companyId, userId, teamMemberId, meta = {}) {
    safe('proacao', companyId, {
      user_id: userId,
      operational_team_member_id: teamMemberId,
      event_type: 'proacao_submitted',
      payload: meta
    });
  },
  intelligentRegistration(companyId, userId, teamMemberId, meta = {}) {
    safe('registro_inteligente', companyId, {
      user_id: userId,
      operational_team_member_id: teamMemberId,
      event_type: 'intelligent_registration',
      payload: meta
    });
  },
  qualityEvent(companyId, userId, meta = {}) {
    safe('qualidade', companyId, { user_id: userId, event_type: 'quality_event', payload: meta });
  },
  sstIncident(companyId, userId, meta = {}) {
    safe('sst', companyId, { user_id: userId, event_type: 'sst_incident', payload: meta });
  },
  nearMiss(companyId, userId, meta = {}) {
    safe('sst', companyId, { user_id: userId, event_type: 'near_miss', payload: meta });
  },
  communication(companyId, userId, meta = {}) {
    safe('comunicacao', companyId, { user_id: userId, event_type: 'communication', payload: meta });
  },
  manuIa(companyId, userId, meta = {}) {
    safe('manu_ia', companyId, { user_id: userId, event_type: 'os_completed', payload: { ...meta, module: 'manu_ia' } });
  },
  technicalLibrary(companyId, userId, meta = {}) {
    safe('biblioteca', companyId, {
      user_id: userId,
      event_type: 'learning',
      payload: { ...meta, module: 'biblioteca_tecnica' }
    });
  },
  trainingCompleted(companyId, userId, meta = {}) {
    safe('treinamento', companyId, { user_id: userId, event_type: 'training_completed', payload: meta });
  },
  recognition(companyId, userId, meta = {}) {
    safe('rh', companyId, { user_id: userId, event_type: 'recognition', payload: meta });
  },
  logisticsEvent(companyId, userId, meta = {}) {
    safe('logistica', companyId, {
      user_id: userId,
      event_type: 'procedure_compliance',
      payload: { ...meta, module: 'logistica' }
    });
  },
  warehouseEvent(companyId, userId, meta = {}) {
    safe('almoxarifado', companyId, {
      user_id: userId,
      event_type: 'procedure_compliance',
      payload: { ...meta, module: 'almoxarifado' }
    });
  },
  assetManagement(companyId, userId, meta = {}) {
    safe('ativos', companyId, {
      user_id: userId,
      event_type: 'procedure_compliance',
      payload: { ...meta, module: 'gestao_ativos' }
    });
  },
  roleChanged(companyId, userId, meta = {}) {
    safe('rh', companyId, { user_id: userId, event_type: 'role_changed', payload: meta });
  },
  sectorChanged(companyId, userId, meta = {}) {
    safe('rh', companyId, { user_id: userId, event_type: 'sector_changed', payload: meta });
  },
  hierarchyChanged(companyId, userId, meta = {}) {
    safe('rh', companyId, { user_id: userId, event_type: 'hierarchy_changed', payload: meta });
  },
  dashboardInteraction(companyId, userId, meta = {}) {
    safe('dashboard', companyId, {
      user_id: userId,
      event_type: 'internal_event',
      payload: { ...meta, module: 'dashboard' }
    });
  },
  fromRequest(req, eventType, meta = {}) {
    const u = fromUser(req);
    if (!req?.user?.company_id) return;
    safe('http_bridge', req.user.company_id, {
      ...u,
      event_type: eventType,
      payload: { ...meta, path: req.path, method: req.method }
    });
  }
};

module.exports = { ecosystemHooks, fromUser, safe };
