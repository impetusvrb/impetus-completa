/**
 * Anexos / evidências — armazenamento local (IndexedDB) + evento backbone (append-only ref).
 * Sem endpoint de upload novo: compatível offline e tenant-isolado.
 */
import { qualityOperational } from '../../../services/api.js';
import { isQualityAttachmentRuntimeEnabled, isQualityOfflineRuntimeEnabled } from '../operational-runtime/qualityOperationalFeatureFlags.js';
import { qualityEnqueueMutation } from '../offline/qualityOfflineQueue.js';
import { compressImageFile } from './qualityAttachmentCompression.js';
import { qStoreSet, qStoreDel, qStoreKeysForTenant, qStoreGet } from '../offline/qualityOfflineStorage.js';
import { sha256HexFromArrayBuffer, isPlausibleSha256Hex } from './qualityAttachmentIntegrity.js';
import { noteQualityAttachmentAttempt, noteQualityAttachmentFailure } from '../../../observability/qualityOperationalTelemetry.js';

async function publishAttached({ companyId, inspectionId, correlationId, workflowId, payload }, options = {}) {
  const maxRetries = Number(options.maxRetries ?? 2);
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  const body = {
    event_name: 'quality.evidence.attached',
    correlation_id: correlationId || crypto.randomUUID(),
    workflow_id: workflowId,
    payload
  };
  noteQualityAttachmentAttempt();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.({ phase: 'publish', attempt, total: maxRetries + 1 });
      await qualityOperational.publishEvent(body);
      return { ok: true };
    } catch (err) {
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
        continue;
      }
      noteQualityAttachmentFailure();
      if (isQualityOfflineRuntimeEnabled()) {
        await qualityEnqueueMutation({
          companyId,
          kind: 'quality.event',
          idempotencyKey: `ev:${payload.evidence_ref}`,
          body,
          correlationId: body.correlation_id
        });
        return { ok: false, queued: true, error: err?.message };
      }
      throw err;
    }
  }
  return { ok: false, error: 'publish_exhausted' };
}

/**
 * @param {{ companyId: string, file: File, inspectionId?: string, correlationId?: string, workflowId?: string, compress?: boolean, onProgress?: (p: object) => void, maxPublishRetries?: number }} args
 */
export async function stageQualityEvidence({
  companyId,
  file,
  inspectionId,
  correlationId,
  workflowId,
  compress = true,
  onProgress,
  maxPublishRetries = 2
}) {
  if (!isQualityAttachmentRuntimeEnabled()) {
    return { ok: false, reason: 'attachment_runtime_disabled' };
  }

  onProgress?.({ phase: 'read', progress: 0.05 });

  let blob = file;
  let meta = { name: file.name, type: file.type, size: file.size };
  if (compress && file.type.startsWith('image/')) {
    const c = await compressImageFile(file);
    blob = c.blob;
    meta = { ...meta, compressed: !c.skipped, w: c.width, h: c.height };
  }

  const evidence_ref = crypto.randomUUID();
  const buf = await blob.arrayBuffer();
  const sha256 = await sha256HexFromArrayBuffer(buf);
  if (sha256) meta = { ...meta, sha256 };

  onProgress?.({ phase: 'stage_idb', progress: 0.35 });

  await qStoreSet(companyId, `evidence:${evidence_ref}`, {
    inspection_id: inspectionId || null,
    buffer: buf,
    meta,
    staged_at: new Date().toISOString()
  });

  const payload = {
    evidence_ref,
    inspection_id: inspectionId || null,
    meta: { ...meta, byte_length: buf.byteLength }
  };

  onProgress?.({ phase: 'publish', progress: 0.6 });

  const pub = await publishAttached(
    { companyId, inspectionId, correlationId, workflowId, payload },
    { maxRetries: maxPublishRetries, onProgress }
  );
  if (!pub.ok && !pub.queued) {
    try {
      await qStoreDel(companyId, `evidence:${evidence_ref}`);
    } catch {
      /* ignore */
    }
  }
  return { ...pub, evidence_ref, integrity_ok: isPlausibleSha256Hex(sha256) };
}

/**
 * Remove evidências apenas locais muito antigas (sem inferir estado de evento no backbone).
 * @param {string} companyId
 * @param {number} maxAgeMs
 */
export async function pruneOrphanStagedEvidence(companyId, maxAgeMs = 7 * 24 * 3600 * 1000) {
  if (!companyId || !isQualityAttachmentRuntimeEnabled()) return { removed: 0 };
  const prefix = `impetus:quality_op:idb:v1:${companyId}:`;
  const ks = await qStoreKeysForTenant(companyId);
  const now = Date.now();
  let removed = 0;
  for (const key of ks) {
    const sk = String(key);
    if (!sk.startsWith(prefix)) continue;
    const suffix = sk.slice(prefix.length);
    if (!suffix.startsWith('evidence:')) continue;
    const row = await qStoreGet(companyId, suffix);
    const ts = row?.staged_at ? Date.parse(row.staged_at) : 0;
    if (ts && now - ts > maxAgeMs) {
      await qStoreDel(companyId, suffix);
      removed += 1;
    }
  }
  return { removed };
}

/**
 * Captura unificada (foto, PDF pequeno, vídeo curto — limitado pelo browser).
 */
export async function captureQualityEvidence(args) {
  return stageQualityEvidence(args);
}
