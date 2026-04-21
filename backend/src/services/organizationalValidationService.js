/**
 * IMPETUS — Validação organizacional hierárquica por área (departamento)
 * CEO → diretores | Diretor (área) → gerentes | Gerente → coordenadores | Coordenador → supervisores
 */

const db = require('../db');
const { logAction } = require('../middleware/audit');

const STRATEGIC_ROLES = ['diretor', 'gerente', 'coordenador', 'supervisor'];

const SENSITIVE_USER_FIELDS = [
  'department_id',
  'functional_area',
  'hierarchy_level',
  'role',
  'area',
  'job_title',
  'company_role_id',
  'hr_responsibilities',
  'supervisor_id'
];

function isStrategicRole(role) {
  return STRATEGIC_ROLES.includes((role || '').toLowerCase());
}

function snapshotFromUserRow(row, extra = {}) {
  if (!row) return null;
  return {
    name: row.name,
    email: row.email,
    department_id: row.department_id,
    department_name: row.department_name || extra.department_name || null,
    role: row.role,
    hierarchy_level: row.hierarchy_level,
    area: row.area,
    job_title: row.job_title,
    functional_area: row.functional_area,
    company_role_id: row.company_role_id,
    structural_role_name: row.structural_role_name || null,
    hr_responsibilities: row.hr_responsibilities,
    supervisor_id: row.supervisor_id,
    updated_at: row.updated_at
  };
}

function diffSnapshots(oldSnap, newSnap) {
  if (!oldSnap || !newSnap) return [];
  const changes = [];
  for (const key of SENSITIVE_USER_FIELDS) {
    const a = oldSnap[key];
    const b = newSnap[key];
    const same = JSON.stringify(a) === JSON.stringify(b);
    if (!same) changes.push({ field: key, old: a ?? null, new: b ?? null });
  }
  if ((oldSnap.name || '') !== (newSnap.name || '')) {
    changes.push({ field: 'name', old: oldSnap.name, new: newSnap.name });
  }
  if ((oldSnap.email || '') !== (newSnap.email || '')) {
    changes.push({ field: 'email', old: oldSnap.email, new: newSnap.email });
  }
  return changes;
}

function hasSensitiveChange(oldSnap, newSnap) {
  return diffSnapshots(oldSnap, newSnap).length > 0;
}

/**
 * Resolve o validador correto na mesma empresa.
 * Diretor → CEO (único ou primeiro). Demais → superior imediato na mesma department_id.
 */
async function resolveApproverUserId(companyId, subject) {
  const role = (subject.role || '').toLowerCase();
  if (role === 'ceo' || role === 'colaborador' || role === 'internal_admin') {
    return { approverId: null, reason: 'not_applicable' };
  }
  if (!isStrategicRole(role)) {
    return { approverId: null, reason: 'not_applicable' };
  }
  if (role === 'diretor') {
    const ceo = await db.query(
      `SELECT id FROM users
       WHERE company_id = $1 AND role = 'ceo' AND deleted_at IS NULL AND COALESCE(active, true) = true
       ORDER BY created_at ASC NULLS LAST, id ASC
       LIMIT 1`,
      [companyId]
    );
    const id = ceo.rows[0]?.id || null;
    return { approverId: id, reason: id ? null : 'no_ceo' };
  }

  const deptId = subject.department_id;
  if (!deptId) {
    return { approverId: null, reason: 'no_department' };
  }

  const superiorRole = {
    gerente: 'diretor',
    coordenador: 'gerente',
    supervisor: 'coordenador'
  }[role];

  if (!superiorRole) {
    return { approverId: null, reason: 'unknown_role' };
  }

  const deptRes = await db.query(
    `SELECT manager_id FROM departments WHERE id = $1 AND company_id = $2`,
    [deptId, companyId]
  );
  const managerId = deptRes.rows[0]?.manager_id;
  if (managerId) {
    const mgr = await db.query(
      `SELECT id, role FROM users WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL AND COALESCE(active, true) = true`,
      [managerId, companyId]
    );
    const ur = mgr.rows[0];
    if (ur && (ur.role || '').toLowerCase() === superiorRole) {
      if (ur.id === subject.id) {
        return { approverId: null, reason: 'self_reference' };
      }
      return { approverId: ur.id, reason: null };
    }
  }

  const q = await db.query(
    `SELECT u.id FROM users u
     WHERE u.company_id = $1 AND u.department_id = $2 AND u.role = $3
     AND u.deleted_at IS NULL AND COALESCE(u.active, true) = true
     ORDER BY u.hierarchy_level ASC NULLS LAST, u.created_at ASC NULLS LAST
     LIMIT 1`,
    [companyId, deptId, superiorRole]
  );
  const aid = q.rows[0]?.id || null;
  if (aid && aid === subject.id) {
    return { approverId: null, reason: 'self_reference' };
  }
  return { approverId: aid, reason: aid ? null : 'no_superior_in_department' };
}

async function loadUserForValidation(userId, companyId) {
  const r = await db.query(
    `SELECT u.*, d.name AS department_name, cr.name AS structural_role_name
     FROM users u
     LEFT JOIN departments d ON d.id = u.department_id
     LEFT JOIN company_roles cr ON cr.id = u.company_role_id
     WHERE u.id = $1 AND u.company_id = $2 AND u.deleted_at IS NULL`,
    [userId, companyId]
  );
  return r.rows[0] || null;
}

async function appendHistory({
  companyId,
  subjectUserId,
  actorUserId,
  requestId,
  action,
  details,
  ipAddress
}) {
  await db.query(
    `INSERT INTO organizational_validation_history
     (company_id, subject_user_id, actor_user_id, request_id, action, details, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      companyId,
      subjectUserId,
      actorUserId || null,
      requestId || null,
      action,
      details ? JSON.stringify(details) : null,
      ipAddress || null
    ]
  );
}

/**
 * Enfileira ou atualiza pedido de validação (um por utilizador).
 * @param {object} opts
 * @param {'initial'|'revalidation'} opts.requestType
 */
async function enqueueOrganizationalValidation(opts) {
  const {
    userId,
    companyId,
    requestType = 'initial',
    changeDiff = null,
    actorUserId,
    ipAddress,
    userAgent
  } = opts;

  const subject = await loadUserForValidation(userId, companyId);
  if (!subject) {
    return { ok: false, error: 'Utilizador não encontrado' };
  }

  const role = (subject.role || '').toLowerCase();
  if (role === 'ceo' || role === 'colaborador' || role === 'internal_admin') {
    return { ok: true, skipped: true, reason: 'not_applicable' };
  }
  if (!isStrategicRole(role)) {
    return { ok: true, skipped: true, reason: 'not_strategic' };
  }

  const snap = snapshotFromUserRow(subject);
  const resolved = await resolveApproverUserId(companyId, subject);

  const structureError = resolved.reason && resolved.reason !== 'not_applicable'
    ? resolved.reason
    : null;

  if (!resolved.approverId) {
    await db.query(
      `UPDATE users SET
        role_verified = false,
        role_verification_status = 'awaiting_structure',
        role_verification_method = 'hierarchical_pending',
        updated_at = now()
       WHERE id = $1 AND company_id = $2`,
      [userId, companyId]
    );

    await db.query(
      `INSERT INTO role_verification_requests (
        company_id, user_id, requested_role, approver_id, status, ip_address,
        department_id, request_type, subject_snapshot, change_diff, structure_error, updated_at
      ) VALUES ($1, $2, $3, NULL, 'pending', $4, $5, $6, $7::jsonb, $8::jsonb, $9, now())
      ON CONFLICT (user_id) DO UPDATE SET
        requested_role = EXCLUDED.requested_role,
        approver_id = NULL,
        status = 'pending',
        ip_address = EXCLUDED.ip_address,
        department_id = EXCLUDED.department_id,
        request_type = EXCLUDED.request_type,
        subject_snapshot = EXCLUDED.subject_snapshot,
        change_diff = EXCLUDED.change_diff,
        structure_error = EXCLUDED.structure_error,
        rejected_at = NULL,
        rejection_reason = NULL,
        approved_at = NULL,
        updated_at = now()
      `,
      [
        companyId,
        userId,
        subject.role,
        ipAddress || null,
        subject.department_id || null,
        requestType,
        JSON.stringify(snap),
        changeDiff ? JSON.stringify(changeDiff) : null,
        structureError
      ]
    );

    await appendHistory({
      companyId,
      subjectUserId: userId,
      actorUserId,
      requestId: null,
      action: 'validation_queued_no_structure',
      details: { structure_error: structureError, snapshot: snap },
      ipAddress
    });

    await logAction({
      companyId,
      userId: actorUserId || userId,
      action: 'role_verification_structure_missing',
      entityType: 'user',
      entityId: userId,
      description: `Validação pendente: sem validador hierárquico (${structureError || 'desconhecido'})`,
      ipAddress,
      userAgent,
      severity: 'warning',
      success: true
    });

    return { ok: true, awaitingStructure: true, structure_error: structureError };
  }

  await db.query(
    `INSERT INTO role_verification_requests (
      company_id, user_id, requested_role, approver_id, status, ip_address,
      department_id, request_type, subject_snapshot, change_diff, structure_error, updated_at
    ) VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7, $8::jsonb, $9::jsonb, NULL, now())
    ON CONFLICT (user_id) DO UPDATE SET
      requested_role = EXCLUDED.requested_role,
      approver_id = EXCLUDED.approver_id,
      status = 'pending',
      ip_address = EXCLUDED.ip_address,
      department_id = EXCLUDED.department_id,
      request_type = EXCLUDED.request_type,
      subject_snapshot = EXCLUDED.subject_snapshot,
      change_diff = EXCLUDED.change_diff,
      structure_error = NULL,
      rejected_at = NULL,
      rejection_reason = NULL,
      approved_at = NULL,
      updated_at = now()
    `,
    [
      companyId,
      userId,
      subject.role,
      resolved.approverId,
      ipAddress || null,
      subject.department_id || null,
      requestType,
      JSON.stringify(snap),
      changeDiff ? JSON.stringify(changeDiff) : null
    ]
  );

  await db.query(
    `UPDATE users SET
      role_verified = false,
      role_verification_status = $3,
      role_verification_method = 'hierarchical_pending',
      updated_at = now()
     WHERE id = $1 AND company_id = $2`,
    [
      userId,
      companyId,
      requestType === 'revalidation' ? 'pending_revalidation' : 'pending'
    ]
  );

  await appendHistory({
    companyId,
    subjectUserId: userId,
    actorUserId,
    requestId: null,
    action: requestType === 'revalidation' ? 'revalidation_queued' : 'validation_queued',
    details: { approver_id: resolved.approverId, request_type: requestType, change_diff: changeDiff },
    ipAddress
  });

  await logAction({
    companyId,
    userId: actorUserId || userId,
    action: requestType === 'revalidation' ? 'role_revalidation_requested' : 'role_verification_requested',
    entityType: 'user',
    entityId: userId,
    description:
      requestType === 'revalidation'
        ? `Revalidação de cargo solicitada (${subject.role})`
        : `Validação de cargo solicitada (${subject.role})`,
    ipAddress,
    userAgent,
    severity: 'info',
    success: true
  });

  return { ok: true, approver_id: resolved.approverId, request_type: requestType };
}

/**
 * Verifica se o utilizador atual pode aprovar/rejeitar o sujeito (recomputa hierarquia).
 */
async function assertApproverMatches(companyId, approverUserId, subjectUser) {
  const r = await resolveApproverUserId(companyId, subjectUser);
  if (!r.approverId) {
    return { ok: false, code: 'NO_APPROVER', error: 'Estrutura organizacional incompleta para esta validação.' };
  }
  if (r.approverId !== approverUserId) {
    return { ok: false, code: 'FORBIDDEN_APPROVER', error: 'Apenas o validador hierárquico correto pode concluir esta etapa.' };
  }
  if (approverUserId === subjectUser.id) {
    return { ok: false, code: 'SELF_APPROVAL', error: 'Não é permitido validar a própria conta.' };
  }
  return { ok: true };
}

/**
 * Após criar ou alterar utilizador (admin): fila inicial ou revalidação se dados sensíveis mudaram.
 * @param {object|null} beforeSnapshot — resultado de snapshotFromUserRow antes do UPDATE; null em criação.
 */
async function syncAfterUserProfileChange(userId, companyId, opts = {}) {
  const { beforeSnapshot = null, actorUserId, ipAddress, userAgent } = opts;
  const subject = await loadUserForValidation(userId, companyId);
  if (!subject) return { ok: false, error: 'not_found' };

  const role = (subject.role || '').toLowerCase();
  if (!isStrategicRole(role)) {
    await db.query(`DELETE FROM role_verification_requests WHERE user_id = $1`, [userId]);
    await db.query(
      `UPDATE users SET role_verified = true, role_verification_status = 'approved', updated_at = now()
       WHERE id = $1 AND company_id = $2`,
      [userId, companyId]
    );
    return { ok: true, skipped: true, reason: 'not_strategic' };
  }

  if (!beforeSnapshot) {
    return enqueueOrganizationalValidation({
      userId,
      companyId,
      requestType: 'initial',
      actorUserId,
      ipAddress,
      userAgent
    });
  }

  const afterSnap = snapshotFromUserRow(subject);
  if (hasSensitiveChange(beforeSnapshot, afterSnap)) {
    return enqueueOrganizationalValidation({
      userId,
      companyId,
      requestType: 'revalidation',
      changeDiff: diffSnapshots(beforeSnapshot, afterSnap),
      actorUserId,
      ipAddress,
      userAgent
    });
  }

  return { ok: true, skipped: true, reason: 'no_sensitive_change' };
}

module.exports = {
  STRATEGIC_ROLES,
  SENSITIVE_USER_FIELDS,
  isStrategicRole,
  snapshotFromUserRow,
  diffSnapshots,
  hasSensitiveChange,
  resolveApproverUserId,
  loadUserForValidation,
  enqueueOrganizationalValidation,
  appendHistory,
  assertApproverMatches,
  syncAfterUserProfileChange
};
