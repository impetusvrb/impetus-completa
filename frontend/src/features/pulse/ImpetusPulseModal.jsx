/**
 * Impetus Pulse — Autoavaliação do Nosso Desempenho (4 fixas + 3 dinâmicas).
 */
import React, { useMemo, useState } from 'react';
import Modal from '../../components/Modal';
import { pulse } from '../../services/api';
import './ImpetusPulseModal.css';

const FIXED = [
  { key: 'efficiency', label: 'Eficiência operacional (agilidade em alertas e demandas)' },
  { key: 'confidence', label: 'Confiança tecnológica (segurança ao usar dashboards e processos)' },
  { key: 'proactivity', label: 'Proatividade industrial (melhoria contínua e redução de perdas)' },
  { key: 'synergy', label: 'Sinergia de equipe (comunicação e apoio aos colegas)' }
];

function StarRow({ label, value, onChange }) {
  return (
    <div className="pulse-star-row">
      <span className="pulse-star-row__label">{label}</span>
      <div className="pulse-star-row__stars" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`pulse-star-btn ${value === n ? 'pulse-star-btn--on' : ''}`}
            onClick={() => onChange(n)}
            aria-pressed={value === n}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ImpetusPulseModal({
  evaluation: initial,
  isOpen,
  onClose,
  onSubmitted,
  blocking = false
}) {
  const [evaluation, setEvaluation] = useState(initial);
  const [fixedScores, setFixedScores] = useState({
    efficiency: null,
    confidence: null,
    proactivity: null,
    synergy: null
  });
  const [aiScores, setAiScores] = useState({});
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState(null);

  const questions = useMemo(() => {
    const raw = evaluation?.ai_custom_questions;
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [];
  }, [evaluation]);

  React.useEffect(() => {
    setEvaluation(initial);
    setFixedScores({ efficiency: null, confidence: null, proactivity: null, synergy: null });
    setAiScores({});
    setStep(0);
    setFeedback(null);
    setError(null);
  }, [initial, isOpen]);

  if (!isOpen || !evaluation?.id) return null;

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const ai_answers = {};
      questions.forEach((q) => {
        ai_answers[q.qid] = aiScores[q.qid];
      });
      const res = await pulse.submitMe({
        evaluation_id: evaluation.id,
        fixed_scores: fixedScores,
        ai_answers
      });
      setFeedback(res.data?.ai_feedback_message || 'Obrigado pela sua participação.');
      setStep(2);
      onSubmitted?.(res.data);
    } catch (e) {
      setError(e.apiMessage || e.message || 'Não foi possível enviar.');
    } finally {
      setSaving(false);
    }
  };

  const canNext =
    FIXED.every((f) => fixedScores[f.key] >= 1 && fixedScores[f.key] <= 5) &&
    questions.every((q) => aiScores[q.qid] >= 1 && aiScores[q.qid] <= 5);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Autoavaliação do Nosso Desempenho"
      size="large"
      showCloseButton={!blocking}
      closeOnOverlayClick={!blocking}
      closeOnEscape={!blocking}
    >
      <div className="pulse-modal">
        <p className="pulse-modal__intro">
          O Impetus Pulse conecta a sua percepção aos dados positivos do seu uso da plataforma. Leva poucos
          minutos.
        </p>

        {step === 0 && (
          <>
            <h3 className="pulse-modal__h3">Dimensões fixas (1 a 5)</h3>
            {FIXED.map((f) => (
              <StarRow
                key={f.key}
                label={f.label}
                value={fixedScores[f.key]}
                onChange={(n) => setFixedScores((s) => ({ ...s, [f.key]: n }))}
              />
            ))}
            <div className="pulse-modal__footer">
              <button type="button" className="btn btn-primary" onClick={() => setStep(1)}>
                Continuar
              </button>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h3 className="pulse-modal__h3">Perguntas personalizadas (1 a 5)</h3>
            {questions.map((q) => (
              <div key={q.qid} className="pulse-dyn-block">
                <p className="pulse-dyn-block__q">{q.text}</p>
                <StarRow
                  label="Sua nota"
                  value={aiScores[q.qid]}
                  onChange={(n) => setAiScores((s) => ({ ...s, [q.qid]: n }))}
                />
              </div>
            ))}
            {error && <p className="pulse-modal__err">{error}</p>}
            <div className="pulse-modal__footer pulse-modal__footer--split">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>
                Voltar
              </button>
              <button type="button" className="btn btn-primary" disabled={!canNext || saving} onClick={submit}>
                {saving ? 'Enviando…' : 'Enviar autoavaliação'}
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="pulse-feedback">
            <h3 className="pulse-modal__h3">Um recado para você</h3>
            <p className="pulse-feedback__text">{feedback}</p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Fechar
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
