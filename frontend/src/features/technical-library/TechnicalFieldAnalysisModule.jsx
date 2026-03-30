/**
 * Biblioteca Técnica Inteligente — análise manual por foto/vídeo (ManuIA)
 */
import React, { useMemo, useState, useCallback } from 'react';
import { Camera, Upload, Box, AlertCircle } from 'lucide-react';
import ManuIAUnityViewer from '../../components/manu-ia/ManuIAUnityViewer';
import { technicalLibrary } from '../../services/api';
import * as unityBridge from '../../services/unity/unityBridge';
import './TechnicalFieldAnalysisModule.css';

const MAINT_TYPES = [
  { value: '', label: 'Selecione…' },
  { value: 'preventiva', label: 'Preventiva' },
  { value: 'corretiva', label: 'Corretiva' },
  { value: 'preditiva', label: 'Preditiva' },
  { value: 'emergencial', label: 'Emergencial' }
];

const URGENCY = [
  { value: '', label: 'Selecione…' },
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' }
];

function buildResearchFromPayload(data) {
  const up = data?.unity_payload || {};
  const ai = data?.ai_result || {};
  return {
    equipment: {
      name: ai.suspectedComponent || data?.machine_label || 'Equipamento',
      category: ai.assetType || 'industrial',
      model: ai.assetSubtype || ''
    },
    library_model_url: up.modelUrl || null,
    technical_library_resolution: { unityPayload: up },
    machine_id: up.machineId || null
  };
}

export default function TechnicalFieldAnalysisModule() {
  const [machineLabel, setMachineLabel] = useState('');
  const [sector, setSector] = useState('');
  const [maintenanceType, setMaintenanceType] = useState('');
  const [urgency, setUrgency] = useState('');
  const [observation, setObservation] = useState('');
  const [photoFiles, setPhotoFiles] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [showUnity, setShowUnity] = useState(false);

  const previews = useMemo(() => {
    const urls = photoFiles.map((f) => ({ url: URL.createObjectURL(f), type: 'img' }));
    return urls;
  }, [photoFiles]);

  React.useEffect(() => {
    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [previews]);

  const videoPreviewUrl = useMemo(() => (videoFile ? URL.createObjectURL(videoFile) : null), [videoFile]);
  React.useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const onPhotosChange = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    setPhotoFiles(files);
  };

  const onVideoChange = (e) => {
    const f = e.target.files?.[0] || null;
    setVideoFile(f);
  };

  const applyUnityPayload = useCallback((up) => {
    if (!up || typeof up !== 'object') return;
    const url = up.modelUrl;
    if (url && typeof url === 'string') {
      unityBridge.loadModelFromUrl(url);
    }
    if (up.recommendedRenderMode || up.renderMode) {
      const m = String(up.recommendedRenderMode || up.renderMode).toLowerCase();
      if (m.includes('xray')) unityBridge.setXRayMode(true, up.cameraFocus || '');
      if (m.includes('explod')) unityBridge.explodeView(up.cameraFocus || '');
    }
    const focus = up.cameraFocus || (Array.isArray(up.highlightParts) && up.highlightParts[0]);
    if (focus) unityBridge.focusPart(String(focus));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!photoFiles.length && !videoFile) {
      setError('Adicione pelo menos uma foto ou um vídeo.');
      return;
    }
    setLoading(true);
    setResult(null);
    setShowUnity(false);
    try {
      const fd = new FormData();
      if (machineLabel.trim()) fd.append('machine_label', machineLabel.trim());
      if (sector.trim()) fd.append('sector', sector.trim());
      if (maintenanceType) fd.append('maintenance_type', maintenanceType);
      if (urgency) fd.append('urgency', urgency);
      if (observation.trim()) fd.append('observation', observation.trim());
      photoFiles.forEach((f) => fd.append('photos', f));
      if (videoFile) fd.append('video', videoFile);
      const res = await technicalLibrary.fieldAnalysis.create(fd);
      setResult(res.data?.data || null);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Não foi possível concluir a análise.';
      setError(typeof msg === 'string' ? msg : 'Erro na análise.');
    } finally {
      setLoading(false);
    }
  };

  const onOpenUnity = () => {
    if (!result?.unity_payload) return;
    setShowUnity(true);
    setTimeout(() => {
      applyUnityPayload(result.unity_payload);
      const el = document.getElementById('tl-field-unity-anchor');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  };

  const research = result ? buildResearchFromPayload(result) : null;
  const ai = result?.ai_result || {};

  return (
    <div className="tl-field">
      <div>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 8px' }}>
          <Camera size={22} /> Análise de campo (foto / vídeo)
        </h2>
        <p className="tl-field__intro">
          Envie imagens ou um vídeo do equipamento. A IA analisa visualmente, sugere falha provável e prepara uma
          visualização no Unity (modelo da biblioteca, similar ou genérico — nunca fica vazio).
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="tl-field__grid">
          <label>
            Máquina / equipamento
            <input
              value={machineLabel}
              onChange={(e) => setMachineLabel(e.target.value)}
              placeholder="Ex.: bomba hidráulica linha 3"
            />
          </label>
          <label>
            Setor
            <input value={sector} onChange={(e) => setSector(e.target.value)} placeholder="Ex.: usinagem" />
          </label>
          <label>
            Tipo de manutenção
            <select value={maintenanceType} onChange={(e) => setMaintenanceType(e.target.value)}>
              {MAINT_TYPES.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Urgência
            <select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
              {URGENCY.map((o) => (
                <option key={o.value || 'empty'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ gridColumn: '1 / -1' }}>
            Observação
            <textarea value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Contexto adicional..." />
          </label>
        </div>

        <div className="tl-field__files" style={{ marginTop: 16 }}>
          <label>
            <Upload size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Fotos (uma ou várias)
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPhotosChange} />
          </label>
          <div className="tl-field__previews">
            {previews.map((p) => (
              <img key={p.url} src={p.url} alt="" />
            ))}
          </div>
        </div>

        <div className="tl-field__files" style={{ marginTop: 12 }}>
          <label>
            Vídeo (opcional)
            <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={onVideoChange} />
          </label>
          {videoPreviewUrl && (
            <video src={videoPreviewUrl} controls muted style={{ maxWidth: 320, borderRadius: 8 }} />
          )}
        </div>

        {error && (
          <div className="tl-field__err" style={{ marginTop: 14 }}>
            <AlertCircle size={16} style={{ verticalAlign: 'text-top', marginRight: 6 }} />
            {error}
          </div>
        )}

        <div className="tl-field__actions" style={{ marginTop: 18 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? (
              <>
                <span className="manuia-spinner-sm" /> Analisando…
              </>
            ) : (
              <>
                <Camera size={18} /> Analisar com IA
              </>
            )}
          </button>
        </div>
      </form>

      {result && result.status === 'completed' && (
        <div className="tl-field__result">
          <h3>Resultado técnico</h3>
          {typeof result.fallback_level === 'number' && (
            <p>
              <span className="tl-field__badge">Fallback nível {result.fallback_level}</span>
            </p>
          )}
          <dl className="tl-field__kv">
            <dt>Ativo provável</dt>
            <dd>{ai.assetType || '—'}</dd>
            <dt>Subtipo</dt>
            <dd>{ai.assetSubtype || '—'}</dd>
            <dt>Confiança</dt>
            <dd>{ai.confidence != null ? `${Math.round(Number(ai.confidence) * 100)}%` : '—'}</dd>
            <dt>Componente suspeito</dt>
            <dd>{ai.suspectedComponent || '—'}</dd>
            <dt>Falha provável</dt>
            <dd>{ai.faultType || '—'}</dd>
            <dt>Severidade</dt>
            <dd>{ai.severity || '—'}</dd>
            <dt>Recomendação</dt>
            <dd>{ai.recommendation || '—'}</dd>
            <dt>Validação humana</dt>
            <dd>{ai.needsHumanValidation ? 'Sim' : 'Não'}</dd>
          </dl>
          <div className="tl-field__actions" style={{ marginTop: 16 }}>
            <button type="button" className="btn btn-primary" onClick={onOpenUnity}>
              <Box size={18} /> Abrir visualização no Unity
            </button>
          </div>
        </div>
      )}

      {showUnity && research && (
        <div id="tl-field-unity-anchor" className="tl-field__unity-wrap">
          <ManuIAUnityViewer variant="search" research={research} viewMode="normal" />
        </div>
      )}
    </div>
  );
}
