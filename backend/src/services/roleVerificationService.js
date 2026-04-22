/**
 * IMPETUS - SERVIÇO DE VALIDAÇÃO HIERÁRQUICA DE CARGOS
 * Verifica que cargos estratégicos sejam ocupados por pessoas realmente autorizadas
 */

const db = require('../db');
const { logAction } = require('../middleware/audit');
const ai = require('./ai');
const path = require('path');
const fs = require('fs').promises;
const orgVal = require('./organizationalValidationService');

// Cargos estratégicos que exigem verificação
const STRATEGIC_ROLES = ['diretor', 'gerente', 'coordenador', 'supervisor'];
const ROLE_HIERARCHY = { ceo: 0, diretor: 1, gerente: 2, coordenador: 3, supervisor: 4, colaborador: 5 };

function getRoleLevel(role) {
  return ROLE_HIERARCHY[(role || '').toLowerCase()] ?? 5;
}

function isStrategicRole(role) {
  return STRATEGIC_ROLES.includes((role || '').toLowerCase());
}

function canApproveRole(approverRole, userRole) {
  const approverLevel = getRoleLevel(approverRole);
  const userLevel = getRoleLevel(userRole);
  return approverLevel < userLevel && approverLevel <= 1; // CEO ou Diretor podem aprovar todos
}

function getMinApproverLevel(userRole) {
  const level = getRoleLevel(userRole);
  return Math.max(0, level - 1); // Superior imediato ou acima
}

/**
 * Verifica se o usuário precisa de validação de cargo
 */
function needsVerification(user) {
  if (!user || !user.company_id) return false;
  const role = (user.role || '').toLowerCase();
  if (role === 'ceo' || role === 'colaborador') return false;
  if (!STRATEGIC_ROLES.includes(role)) return false;
  if (user.role_verified !== true) return true;
  const st = (user.role_verification_status || '').toLowerCase();
  if (st === 'pending_revalidation' || st === 'pending' || st === 'awaiting_structure') return true;
  return false;
}

/**
 * Acesso a dados estratégicos: exige verificação válida (inclui bloqueio em revalidação pendente)
 */
function isAccessAllowedForStrategicUser(user) {
  if (!user) return false;
  if (!orgVal.isStrategicRole(user.role)) return true;
  if (user.is_company_root === true) return true;
  if (user.role_verified !== true) return false;
  const st = (user.role_verification_status || '').toLowerCase();
  if (['rejected', 'pending', 'pending_revalidation', 'awaiting_structure'].includes(st)) return false;
  return true;
}

/**
 * Verifica se email é corporativo (domínio da empresa)
 */
async function checkCorporateEmail(user, company) {
  const email = (user.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return false;

  let domain = company?.company_domain?.trim()?.toLowerCase();
  if (!domain) {
    const dc = (company?.data_controller_email || '').trim();
    if (dc && dc.includes('@')) domain = dc.split('@')[1];
  }
  if (!domain) return false;

  const emailDomain = email.split('@')[1];
  return emailDomain === domain || emailDomain.endsWith('.' + domain);
}

/**
 * Marca CEO/raiz como verificado (setup da empresa)
 */
async function markCompanyRoot(userId, companyId) {
  await db.query(`
    UPDATE users SET is_company_root = true, role_verified = true, role_verification_status = 'approved',
      role_verified_at = now(), role_verification_method = 'company_setup'
    WHERE id = $1 AND company_id = $2
  `, [userId, companyId]);

  await db.query(`
    UPDATE companies SET founder_id = $1 WHERE id = $2
  `, [userId, companyId]);
}

/**
 * Valida por email corporativo
 */
async function verifyByCorporateEmail(userId, companyId, ipAddress, userAgent) {
  const userRes = await db.query(`
    SELECT u.id, u.name, u.email, u.role FROM users u WHERE u.id = $1 AND u.company_id = $2
  `, [userId, companyId]);
  if (userRes.rows.length === 0) return { ok: false, error: 'Usuário não encontrado' };

  const companyRes = await db.query(`
    SELECT id, company_domain, data_controller_email FROM companies WHERE id = $1
  `, [companyId]);
  if (companyRes.rows.length === 0) return { ok: false, error: 'Empresa não encontrada' };

  const isCorporate = await checkCorporateEmail(userRes.rows[0], companyRes.rows[0]);
  if (!isCorporate) return { ok: false, error: 'Email não é do domínio corporativo. Use email da empresa.' };

  await db.query(`
    UPDATE users SET role_verified = true, role_verification_status = 'approved',
      role_verified_at = now(), role_verified_by = NULL, role_verification_method = 'corporate_email'
    WHERE id = $1
  `, [userId]);

  await logAction({
    companyId,
    userId,
    action: 'role_verified',
    entityType: 'user',
    entityId: userId,
    description: `Cargo validado por email corporativo: ${userRes.rows[0].email}`,
    ipAddress,
    userAgent,
    severity: 'info',
    success: true
  });

  return { ok: true };
}

/**
 * Cria solicitação de aprovação hierárquica (cadeia CEO→diretor→… por departamento)
 */
async function requestHierarchicalApproval(userId, companyId, ipAddress, userAgent) {
  const r = await orgVal.enqueueOrganizationalValidation({
    userId,
    companyId,
    requestType: 'initial',
    actorUserId: userId,
    ipAddress,
    userAgent
  });
  if (!r.ok) return r;
  if (r.skipped) return { ok: false, error: 'Cargo não exige aprovação hierárquica' };
  if (r.awaitingStructure) {
    return {
      ok: false,
      error: 'Estrutura organizacional incompleta (CEO ou departamento). Contacte o administrador.',
      code: 'AWAITING_STRUCTURE',
      structure_error: r.structure_error
    };
  }
  return { ok: true, approver_id: r.approver_id };
}

/**
 * Aprova ou rejeita solicitação (apenas o validador hierárquico correto da mesma área / CEO para diretores)
 */
async function processApprovalRequest(requestId, approverId, approved, rejectionReason, ipAddress, userAgent) {
  const reqRes = await db.query(
    `
    SELECT rvr.*, u.name as user_name, u.email as user_email
    FROM role_verification_requests rvr
    JOIN users u ON u.id = rvr.user_id
    WHERE rvr.id = $1 AND rvr.status = 'pending'
  `,
    [requestId]
  );
  if (reqRes.rows.length === 0) return { ok: false, error: 'Solicitação não encontrada ou já processada' };

  const req = reqRes.rows[0];
  const subject = await orgVal.loadUserForValidation(req.user_id, req.company_id);
  if (!subject) return { ok: false, error: 'Utilizador não encontrado' };

  const strict = await orgVal.assertApproverMatches(req.company_id, approverId, subject);
  if (!strict.ok) {
    return { ok: false, error: strict.error, code: strict.code };
  }

  if (!req.approver_id && !approved) {
    return {
      ok: false,
      error: 'Pedido sem validador atribuível. Corrija a estrutura organizacional antes de reprovar por este fluxo.',
      code: 'NO_APPROVER_IN_REQUEST'
    };
  }

  if (approved) {
    await db.query(
      `
      UPDATE users SET role_verified = true, role_verification_status = 'approved',
        role_verified_at = now(), role_verified_by = $1, role_verification_method = 'hierarchical_approval'
      WHERE id = $2
    `,
      [approverId, req.user_id]
    );
    await db.query(`UPDATE role_verification_requests SET status = 'approved', approved_at = now(), updated_at = now() WHERE id = $1`, [requestId]);
  } else {
    await db.query(
      `
      UPDATE users SET role_verified = false, role_verification_status = 'rejected' WHERE id = $1
    `,
      [req.user_id]
    );
    await db.query(
      `
      UPDATE role_verification_requests SET status = 'rejected', rejected_at = now(), rejection_reason = $1, updated_at = now() WHERE id = $2
    `,
      [rejectionReason || 'Rejeitado pelo superior', requestId]
    );
  }

  await orgVal.appendHistory({
    companyId: req.company_id,
    subjectUserId: req.user_id,
    actorUserId: approverId,
    requestId,
    action: approved ? 'approved' : 'rejected',
    details: {
      rejection_reason: approved ? null : rejectionReason,
      request_type: req.request_type
    },
    ipAddress
  });

  await logAction({
    companyId: req.company_id,
    userId: approverId,
    action: approved ? 'role_verification_approved' : 'role_verification_rejected',
    entityType: 'user',
    entityId: req.user_id,
    description: approved
      ? `Cargo aprovado para ${req.user_name}`
      : `Cargo rejeitado para ${req.user_name}: ${rejectionReason || ''}`,
    ipAddress,
    userAgent,
    severity: approved ? 'info' : 'warning',
    success: true
  });

  return { ok: true, approved };
}

/**
 * Lista solicitações pendentes para o aprovador
 */
async function getPendingApprovalsForUser(approverId) {
  const fullQuery = `
    SELECT rvr.id, rvr.user_id, rvr.requested_role, rvr.created_at,
           rvr.request_type, rvr.subject_snapshot, rvr.change_diff, rvr.structure_error,
           rvr.department_id,
           u.name as user_name, u.email as user_email,
           u.role as user_role, u.hierarchy_level, u.area, u.job_title, u.functional_area,
           u.hr_responsibilities,
           d.name department_name,
           cr.name structural_role_name
    FROM role_verification_requests rvr
    JOIN users u ON u.id = rvr.user_id
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN company_roles cr ON cr.id = u.company_role_id
    WHERE rvr.approver_id = $1 AND rvr.status = 'pending'
    ORDER BY rvr.created_at ASC
  `;
  try {
    const res = await db.query(fullQuery, [approverId]);
    return res.rows;
  } catch (err) {
    const msg = String(err.message || '');
    const code = err.code;
    if (code !== '42703' && !msg.includes('subject_snapshot') && !msg.includes('structure_error')) {
      throw err;
    }
    console.warn('[ROLE_VERIFICATION] pending approvals: colunas estendidas ausentes, usando consulta legada');
    const legacy = await db.query(
      `
      SELECT rvr.id, rvr.user_id, rvr.requested_role, rvr.created_at,
             u.name as user_name, u.email as user_email,
             u.role as user_role, u.hierarchy_level, u.area, u.job_title, u.functional_area,
             u.hr_responsibilities,
             d.name department_name,
             cr.name structural_role_name
      FROM role_verification_requests rvr
      JOIN users u ON u.id = rvr.user_id
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN company_roles cr ON cr.id = u.company_role_id
      WHERE rvr.approver_id = $1 AND rvr.status = 'pending'
      ORDER BY rvr.created_at ASC
    `,
      [approverId]
    );
    return legacy.rows.map((row) => ({
      ...row,
      request_type: null,
      subject_snapshot: null,
      change_diff: null,
      structure_error: null,
      department_id: null
    }));
  }
}

/**
 * Processa documento corporativo - extrai texto e usa IA para validar
 */
async function processVerificationDocument(userId, companyId, filePath, documentType, ipAddress, userAgent) {
  const userRes = await db.query(`
    SELECT u.id, u.name, u.email, u.role FROM users u WHERE u.id = $1 AND u.company_id = $2
  `, [userId, companyId]);
  if (userRes.rows.length === 0) return { ok: false, error: 'Usuário não encontrado' };
  const user = userRes.rows[0];

  let extractedText = '';
  const ext = (path.extname(filePath) || '').toLowerCase();
  try {
    if (['.pdf'].includes(ext)) {
      const pdfParse = require('pdf-parse');
      const data = await fs.readFile(filePath);
      const parsed = await pdfParse(data);
      extractedText = parsed.text || '';
    } else if (['.doc', '.docx'].includes(ext)) {
      try {
        const mammoth = require('mammoth');
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value || '';
      } catch (_) {
        extractedText = '';
      }
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const data = await fs.readFile(filePath);
      const base64 = data.toString('base64');
      const prompt = `Analise esta imagem de documento corporativo (crachá, organograma, documento de RH ou carta de nomeação).
Extraia e retorne APENAS um JSON no formato: {"nome":"Nome da pessoa","cargo":"Cargo/função"}
Se não conseguir identificar, retorne {"nome":"","cargo":""}.`;
      const aiResult = await ai.chatWithVision([
        { role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }] }
      ], { max_tokens: 256, timeout: 30000 });
      const match = (aiResult || '').match(/\{[\s\S]*\}/);
      if (match) extractedText = match[0];
    }
  } catch (err) {
    console.warn('[ROLE_VERIFICATION] Document extraction:', err.message);
    return { ok: false, error: 'Não foi possível processar o documento' };
  }

  let aiExtractedName = '';
  let aiExtractedRole = '';
  let aiConfidence = 0;
  if (extractedText && extractedText.length > 10) {
    try {
      const prompt = `Analise o texto do documento e extraia nome da pessoa e cargo/função.
Retorne APENAS um JSON: {"nome":"Nome completo","cargo":"Cargo ou função"}
Texto do documento:\n${extractedText.slice(0, 4000)}`;
      const aiResult = await ai.chatCompletion(prompt, { max_tokens: 256 });
      const match = (aiResult || '').match(/\{[\s\S]*\}/);
      if (match) {
        const obj = JSON.parse(match[0].replace(/\n/g, ' '));
        aiExtractedName = (obj.nome || '').trim();
        aiExtractedRole = (obj.cargo || '').trim();
        const nameMatch = normalizeName(user.name) === normalizeName(aiExtractedName);
        const roleMatch = rolesMatch(user.role, aiExtractedRole);
        aiConfidence = (nameMatch ? 0.5 : 0) + (roleMatch ? 0.5 : 0);
      }
    } catch (_) {
      aiConfidence = 0;
    }
  }

  const fileName = path.basename(filePath);
  const insRes = await db.query(`
    INSERT INTO role_verification_documents (company_id, user_id, document_type, file_path, file_name, ai_extracted_name, ai_extracted_role, ai_confidence, verification_result, ip_address)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
    RETURNING id
  `, [companyId, userId, documentType || 'documento_corporativo', filePath, fileName, aiExtractedName, aiExtractedRole, aiConfidence, ipAddress]);
  const docId = insRes.rows[0]?.id;

  const verified = aiConfidence >= 0.7;
  if (verified) {
    await db.query(`
      UPDATE users SET role_verified = true, role_verification_status = 'approved',
        role_verified_at = now(), role_verified_by = NULL, role_verification_method = 'corporate_document'
      WHERE id = $1
    `, [userId]);
    if (docId) await db.query(`UPDATE role_verification_documents SET verification_result = 'approved' WHERE id = $1`, [docId]);
    await logAction({
      companyId,
      userId,
      action: 'role_verified',
      entityType: 'user',
      entityId: userId,
      description: `Cargo validado por documento corporativo. Confiança IA: ${(aiConfidence * 100).toFixed(0)}%`,
      ipAddress,
      userAgent,
      severity: 'info',
      success: true
    });
  }

  return {
    ok: true,
    verified,
    ai_extracted_name: aiExtractedName,
    ai_extracted_role: aiExtractedRole,
    ai_confidence: aiConfidence,
    message: verified ? 'Documento validado. Cargo confirmado.' : 'Documento recebido. Aguardando revisão manual ou envie documento mais claro.'
  };
}

function normalizeName(n) {
  return (n || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim();
}

function rolesMatch(userRole, extractedRole) {
  const r = (extractedRole || '').toLowerCase();
  const roleSynonyms = {
    diretor: ['diretor', 'direção', 'diretoria'],
    gerente: ['gerente', 'gerência', 'gestor'],
    coordenador: ['coordenador', 'coordenação'],
    supervisor: ['supervisor', 'supervisão']
  };
  const synonyms = roleSynonyms[(userRole || '').toLowerCase()] || [];
  return synonyms.some(s => r.includes(s));
}

/**
 * Painel: lista usuários com status de verificação
 */
async function getVerificationPanel(companyId) {
  const res = await db.query(
    `
    SELECT u.id, u.name, u.email, u.role, u.role_verified, u.role_verification_status,
           u.role_verified_at, u.role_verification_method, u.is_company_root,
           u.hierarchy_level, u.area, u.job_title, u.functional_area, u.hr_responsibilities,
           u.department_id,
           d.name AS department_name,
           cr.name AS structural_role_name,
           v.name as verified_by_name
    FROM users u
    LEFT JOIN users v ON v.id = u.role_verified_by
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN company_roles cr ON cr.id = u.company_role_id
    WHERE u.company_id = $1 AND u.deleted_at IS NULL
    ORDER BY u.role_verified ASC NULLS LAST, u.role, u.name
  `,
    [companyId]
  );
  return res.rows;
}

/**
 * Detecta padrões suspeitos para alerta IA
 */
async function detectSuspiciousPatterns(companyId) {
  const res = await db.query(`
    SELECT u.id, u.name, u.email, u.role, u.role_verified, u.role_verification_status
    FROM users u
    WHERE u.company_id = $1 AND u.deleted_at IS NULL
      AND u.role IN ('diretor','gerente','coordenador','supervisor')
      AND (u.role_verified = false OR u.role_verification_status IN ('pending','pending_revalidation','awaiting_structure'))
  `, [companyId]);

  const companyRes = await db.query(`SELECT company_domain, data_controller_email FROM companies WHERE id = $1`, [companyId]);
  const company = companyRes.rows[0] || {};
  let corpDomain = (company.company_domain || '').trim();
  if (!corpDomain && company.data_controller_email) corpDomain = company.data_controller_email.split('@')[1] || '';

  const suspicious = [];
  for (const u of res.rows) {
    const emailDomain = (u.email || '').split('@')[1] || '';
    const isPersonal = /gmail|hotmail|yahoo|outlook|live|bol|uol|ig\.com|terra\.com/.test(emailDomain?.toLowerCase());
    if (isPersonal) {
      suspicious.push({
        user_id: u.id,
        name: u.name,
        role: u.role,
        reason: 'Cargo estratégico com email pessoal e sem aprovação hierárquica'
      });
    }
  }
  return suspicious;
}

module.exports = {
  needsVerification,
  isAccessAllowedForStrategicUser,
  isStrategicRole,
  checkCorporateEmail,
  markCompanyRoot,
  verifyByCorporateEmail,
  requestHierarchicalApproval,
  processApprovalRequest,
  getPendingApprovalsForUser,
  processVerificationDocument,
  getVerificationPanel,
  detectSuspiciousPatterns,
  STRATEGIC_ROLES,
  ROLE_HIERARCHY,
  getRoleLevel
};
