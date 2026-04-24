'use strict';

const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { execFfmpegExtractFrames } = require('../../../utils/safeExecFile');
const { v4: uuidv4 } = require('uuid');
const repo = require('../repositories/fieldAnalysisRepository');
const aiAnalytics = require('../../../services/aiAnalyticsService');
const modelResolver = require('./modelResolverService');
const unityVisualizationPayload = require('./unityVisualizationPayloadService');

/** Mesma raiz que `routes/technicalLibrary.js` (src/routes → ../../../uploads/technical-library). */
const UPLOADS_TECH_LIBRARY_ROOT = path.resolve(
  __dirname,
  '../../../../../uploads',
  'technical-library'
);

/**
 * Normaliza o caminho e garante que fique dentro do diretório da sessão de análise
 * (mitiga path traversal e entradas inesperadas ao ffmpeg).
 */
function resolveSafeMediaInFieldAnalysisSession(mediaAbsPath, companyId, analysisId) {
  const sessionDir = path.resolve(
    UPLOADS_TECH_LIBRARY_ROOT,
    String(companyId),
    'field-analysis',
    String(analysisId)
  );
  const resolved = path.resolve(String(mediaAbsPath || ''));
  const rel = path.relative(sessionDir, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    const e = new Error('Caminho de mídia inválido para esta análise.');
    e.status = 400;
    throw e;
  }
  return resolved;
}

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

const AI_SYSTEM = `Você é um especialista em manutenção industrial. Analise imagens de equipamentos, motores, bombas, painéis, rolamentos, vedações, etc.
Responda APENAS um JSON válido (sem markdown), neste schema:
{
  "assetType": "string (ex.: electric_motor, pump, valve, bearing, panel, generic)",
  "assetSubtype": "string ou null",
  "confidence": 0.0 a 1.0,
  "suspectedComponent": "string",
  "faultType": "string",
  "severity": "low|medium|high|critical",
  "recommendedRenderMode": "normal|exploded|xray|xray_exploded|fault_focus",
  "highlightParts": ["id ou nome legível"],
  "cameraFocus": "string",
  "needsHumanValidation": true,
  "recommendation": "texto técnico curto em PT-BR",
  "notes": "observações"
}`;

function parseAiJson(text) {
  const raw = String(text || '').trim();
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let p = tryParse(raw);
  if (p) return p;
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    p = tryParse(m[0]);
    if (p) return p;
  }
  return {
    assetType: 'generic',
    assetSubtype: null,
    confidence: 0.35,
    suspectedComponent: 'componente não identificado',
    faultType: 'indeterminado',
    severity: 'medium',
    recommendedRenderMode: 'fault_focus',
    highlightParts: [],
    cameraFocus: 'suspect-region',
    needsHumanValidation: true,
    recommendation: 'Revisão manual recomendada.',
    notes: 'Resposta da IA não pôde ser interpretada como JSON.'
  };
}

async function imageToBase64Part(absPath) {
  const buf = await fs.promises.readFile(absPath);
  const ext = path.extname(absPath).toLowerCase();
  let mediaType = 'image/jpeg';
  if (ext === '.png') mediaType = 'image/png';
  if (ext === '.webp') mediaType = 'image/webp';
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: mediaType,
      data: buf.toString('base64')
    }
  };
}

async function extractVideoFrames(videoAbsPath, outDir, maxFrames, sessionBaseDir) {
  const mf = maxFrames || 4;
  const frames = [];
  try {
    const safeVideo = path.resolve(String(videoAbsPath || ''));
    const safeOutDir = path.resolve(String(outDir || ''));
    const sessionRoot = path.resolve(String(sessionBaseDir || ''));
    await fs.promises.mkdir(safeOutDir, { recursive: true });
    await execFfmpegExtractFrames({
      videoAbsPath: safeVideo,
      outputDir: safeOutDir,
      sessionBaseDir: sessionRoot,
      maxFrames: mf
    });
    const files = await fs.promises.readdir(safeOutDir);
    for (const f of files.sort()) {
      if (f.startsWith('vf-') && f.endsWith('.jpg')) {
        frames.push(path.join(safeOutDir, f));
      }
    }
  } catch (e) {
    console.warn('[FIELD_ANALYSIS] ffmpeg:', e.message);
  }
  return frames;
}

async function runAnalysis(companyId, userId, analysisId, body, files, publicBaseUrl) {
  void userId;
  if (!client) {
    const e = new Error('ANTHROPIC_API_KEY não configurada');
    e.status = 503;
    throw e;
  }

  const machineLabel = (body.machine_label || body.machine || '').trim() || null;
  const sector = (body.sector || '').trim() || null;
  const maintenanceType = (body.maintenance_type || '').trim() || null;
  const urgency = (body.urgency || '').trim() || null;
  const observation = (body.observation || '').trim() || null;

  const photos = files.photos || [];
  const video = files.video && files.video[0] ? files.video[0] : null;

  const mediaPaths = [];
  const photoAbsPaths = [];
  for (const p of photos) {
    const abs = resolveSafeMediaInFieldAnalysisSession(p.path, companyId, analysisId);
    photoAbsPaths.push(abs);
    mediaPaths.push({
      kind: 'image',
      path: `/uploads/technical-library/${companyId}/field-analysis/${analysisId}/${p.filename}`,
      abs
    });
  }
  let safeVideoAbs = null;
  if (video) {
    safeVideoAbs = resolveSafeMediaInFieldAnalysisSession(video.path, companyId, analysisId);
    mediaPaths.push({
      kind: 'video',
      path: `/uploads/technical-library/${companyId}/field-analysis/${analysisId}/${video.filename}`,
      abs: safeVideoAbs
    });
  }

  let framePaths = [];
  if (video && safeVideoAbs) {
    const framesDir = path.join(path.dirname(safeVideoAbs), 'vframes');
    const resolvedFramesDir = path.resolve(framesDir);
    const sessionDir = path.resolve(
      UPLOADS_TECH_LIBRARY_ROOT,
      String(companyId),
      'field-analysis',
      String(analysisId)
    );
    const relFrames = path.relative(sessionDir, resolvedFramesDir);
    if (relFrames.startsWith('..') || path.isAbsolute(relFrames)) {
      const e = new Error('Diretório de frames inválido.');
      e.status = 400;
      throw e;
    }
    framePaths = await extractVideoFrames(safeVideoAbs, resolvedFramesDir, 4, sessionDir);
    for (const ap of framePaths) {
      mediaPaths.push({
        kind: 'frame',
        path: `/uploads/technical-library/${companyId}/field-analysis/${analysisId}/vframes/${path.basename(ap)}`,
        abs: ap
      });
    }
  }

  const imageAbs = photoAbsPaths.concat(framePaths).filter(Boolean);

  if (imageAbs.length === 0) {
    const e = new Error('Nenhuma imagem disponível para análise (envie fotos ou vídeo processável com ffmpeg).');
    e.status = 400;
    throw e;
  }

  const userText = [
    'Contexto do mecânico:',
    machineLabel ? `Máquina informada: ${machineLabel}` : '',
    sector ? `Setor: ${sector}` : '',
    maintenanceType ? `Tipo de manutenção: ${maintenanceType}` : '',
    urgency ? `Urgência: ${urgency}` : '',
    observation ? `Observação: ${observation}` : '',
    'Analise as imagens e preencha o JSON solicitado.'
  ]
    .filter(Boolean)
    .join('\n');

  const content = [];
  for (const ap of imageAbs.slice(0, 12)) {
    content.push(await imageToBase64Part(ap));
  }
  content.push({ type: 'text', text: userText });

  await repo.updateResult(companyId, analysisId, { status: 'processing' });

  let aiText = '';
  try {
    const resp = await client.messages.create({
      model: process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: AI_SYSTEM,
      messages: [{ role: 'user', content }]
    });
    const block = (resp.content || []).find((b) => b.type === 'text');
    aiText = block ? block.text : '';
  } catch (e) {
    console.error('[FIELD_ANALYSIS] Anthropic:', e.message);
    await repo.updateResult(companyId, analysisId, {
      status: 'failed',
      error_message: e.message,
      ai_result: { error: e.message }
    });
    throw e;
  }

  const ai = parseAiJson(aiText);
  const queryBits = [machineLabel, ai.assetType, ai.assetSubtype, ai.suspectedComponent]
    .filter(Boolean)
    .join(' ');
  const resolverOut = await modelResolver.resolve(
    companyId,
    { query: queryBits || machineLabel || 'equipamento industrial' },
    publicBaseUrl
  );

  const { unityPayload, fallbackLevel, matchedEquipmentId } = unityVisualizationPayload.mergeResolverAndAiHints(
    resolverOut,
    ai,
    { machineLabel, sector }
  );

  const row = await repo.updateResult(companyId, analysisId, {
    status: 'completed',
    media_paths: mediaPaths.map((m) => ({ path: m.path, kind: m.kind })),
    video_path: video ? (mediaPaths.find((m) => m.kind === 'video') || {}).path || null : null,
    extracted_frame_paths: framePaths.map(
      (ap) => `/uploads/technical-library/${companyId}/field-analysis/${analysisId}/vframes/${path.basename(ap)}`
    ),
    ai_result: Object.assign({}, ai, { raw_excerpt: aiText.slice(0, 4000) }),
    unity_payload: unityPayload,
    fallback_level: fallbackLevel,
    matched_equipment_id: matchedEquipmentId
  });

  const faTraceId = uuidv4();
  aiAnalytics.enqueueAiTrace({
    trace_id: faTraceId,
    user_id: userId,
    company_id: companyId,
    module_name: 'technical_field_analysis',
    input_payload: {
      analysis_id: analysisId,
      machine_label: machineLabel,
      sector,
      maintenance_type: maintenanceType,
      urgency,
      observation: observation ? String(observation).slice(0, 4000) : null,
      media: mediaPaths.map((m) => ({ kind: m.kind, path: m.path })),
      user_prompt_excerpt: userText.slice(0, 4000),
      image_and_frame_count: imageAbs.length
    },
    output_response: {
      ai_parsed: ai,
      raw_excerpt: aiText.slice(0, 8000),
      matched_equipment_id: matchedEquipmentId,
      fallback_level: fallbackLevel
    },
    model_info: {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_VISION_MODEL || 'claude-sonnet-4-20250514',
      max_tokens: 2000
    },
    system_fingerprint: null
  });

  return formatRow(row);
}

async function createAndProcess(companyId, userId, analysisId, body, files, publicBaseUrl) {
  const photos = files.photos || [];
  const video = files.video && files.video[0] ? files.video[0] : null;
  if ((!photos || photos.length === 0) && !video) {
    const e = new Error('Envie pelo menos uma foto ou um vídeo.');
    e.status = 400;
    throw e;
  }

  await repo.insert({
    id: analysisId,
    company_id: companyId,
    user_id: userId,
    machine_label: (body.machine_label || body.machine || '').trim() || null,
    sector: (body.sector || '').trim() || null,
    maintenance_type: (body.maintenance_type || '').trim() || null,
    urgency: (body.urgency || '').trim() || null,
    observation: (body.observation || '').trim() || null,
    media_paths: [],
    video_path: null,
    extracted_frame_paths: [],
    status: 'pending'
  });

  try {
    return await runAnalysis(companyId, userId, analysisId, body, files, publicBaseUrl);
  } catch (e) {
    await repo.updateResult(companyId, analysisId, {
      status: 'failed',
      error_message: e.message || 'Erro na análise'
    });
    throw e;
  }
}

async function getById(companyId, id) {
  const row = await repo.findById(companyId, id);
  if (!row) return null;
  return formatRow(row);
}

function formatRow(row) {
  return {
    id: row.id,
    status: row.status,
    machine_label: row.machine_label,
    sector: row.sector,
    maintenance_type: row.maintenance_type,
    urgency: row.urgency,
    observation: row.observation,
    media_paths: row.media_paths,
    video_path: row.video_path,
    extracted_frame_paths: row.extracted_frame_paths,
    ai_result: row.ai_result,
    unity_payload: row.unity_payload,
    fallback_level: row.fallback_level,
    matched_equipment_id: row.matched_equipment_id,
    error_message: row.error_message,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

module.exports = {
  createAndProcess,
  getById,
  runAnalysis
};
