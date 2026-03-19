/**
 * IMPETUS - ManuIA 3D Vision - Modal de geração de relatório PDF
 */
import React, { useState } from 'react';
import { X, FileDown } from 'lucide-react';
import { generateReport } from '../services/reportService';
import SignaturePad from './SignaturePad';
import styles from '../styles/Vision3D.module.css';

export default function ReportModal({
  open,
  onClose,
  data,
  getModelScreenshot,
  machineId
}) {
  const [technicianName, setTechnicianName] = useState('');
  const [osNumber, setOsNumber] = useState('');
  const [signatureBase64, setSignatureBase64] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!data) return;
    setGenerating(true);
    try {
      let modelScreenshotBase64 = null;
      if (getModelScreenshot) {
        modelScreenshotBase64 = await getModelScreenshot();
      }
      const reportData = {
        equipment: data.equipment,
        manufacturer: data.manufacturer,
        severity: data.severity,
        confidence: data.confidence,
        date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        technicianName: technicianName.trim() || '—',
        osNumber: osNumber.trim() || '',
        capturedImageBase64: data.capturedImageBase64 || null,
        modelScreenshotBase64,
        parts: data.parts || [],
        steps: data.steps || [],
        faultParts: data.faultParts || [],
        webSources: data.webSources || [],
        signatureBase64: signatureBase64 || null
      };
      const doc = generateReport(reportData);
      const fileName = `ManuIA_OS_${machineId || 'eq'}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      onClose?.();
    } catch (e) {
      console.error('[ManuIA] generateReport:', e);
    } finally {
      setGenerating(false);
    }
  };

  if (!open) return null;

  return (
    <div className={styles.reportModalOverlay} onClick={onClose}>
      <div className={styles.reportModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.reportModal__header}>
          <h3 className={styles.reportModal__title}>Gerar Ordem de Serviço (PDF)</h3>
          <button type="button" className={styles.reportModal__close} onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className={styles.reportModal__body}>
          <div className={styles.reportModal__field}>
            <label>Nome do técnico</label>
            <input
              type="text"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Nome completo"
              className={styles.reportModal__input}
            />
          </div>
          <div className={styles.reportModal__field}>
            <label>Número da OS</label>
            <input
              type="text"
              value={osNumber}
              onChange={(e) => setOsNumber(e.target.value)}
              placeholder="Opcional"
              className={styles.reportModal__input}
            />
          </div>
          <div className={styles.reportModal__field}>
            <label>Assinatura digital</label>
            <SignaturePad onSignatureChange={setSignatureBase64} />
          </div>
        </div>
        <div className={styles.reportModal__footer}>
          <button type="button" className={styles.captureBtn} onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.generateOSBtn}
            onClick={handleGenerate}
            disabled={generating}
          >
            <FileDown size={18} /> {generating ? 'Gerando...' : 'Gerar e Baixar PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
