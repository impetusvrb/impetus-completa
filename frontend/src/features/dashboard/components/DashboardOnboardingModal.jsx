/**
 * ONBOARDING DO DASHBOARD - Perguntas curtas para personalização
 */
import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronRight, Check } from 'lucide-react';
import { dashboard } from '../../../services/api';
import './DashboardOnboardingModal.css';

export default function DashboardOnboardingModal({ onComplete }) {
  const [needs, setNeeds] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dashboard.getOnboardingStatus()
      .then((r) => {
        setNeeds(r.data?.needs ?? false);
        setQuestions(r.data?.questions || []);
      })
      .catch(() => setNeeds(false))
      .finally(() => setLoading(false));
  }, []);

  const currentQ = questions[step];

  const handleSelect = (value, multi = false) => {
    if (multi) {
      const arr = answers[currentQ?.id] || [];
      const next = arr.includes(value)
        ? arr.filter((v) => v !== value)
        : [...arr, value];
      setAnswers((a) => ({ ...a, [currentQ.id]: next }));
    } else {
      setAnswers((a) => ({ ...a, [currentQ.id]: value }));
    }
  };

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await dashboard.saveOnboarding(answers);
      setNeeds(false);
      onComplete?.();
    } catch (e) {
      console.error('[DashboardOnboarding]', e);
    } finally {
      setSaving(false);
    }
  };

  const canAdvance = () => {
    if (!currentQ) return false;
    const v = answers[currentQ.id];
    if (currentQ.multi) return Array.isArray(v) && v.length > 0;
    return v != null && v !== '';
  };

  if (loading || !needs) return null;

  return (
    <div className="dashboard-onboarding-overlay">
      <div className="dashboard-onboarding-modal">
        <header className="dashboard-onboarding-header">
          <Sparkles size={28} />
          <h2>Personalize seu dashboard</h2>
          <p>Responde rápido para ajustarmos a sua experiência</p>
        </header>
        <div className="dashboard-onboarding-body">
          {currentQ && (
            <>
              <h3>{currentQ.question}</h3>
              <div className="dashboard-onboarding-options">
                {currentQ.options.map((opt) => {
                  const selected = currentQ.multi
                    ? (answers[currentQ.id] || []).includes(opt.value)
                    : answers[currentQ.id] === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`onboarding-option ${selected ? 'selected' : ''}`}
                      onClick={() => handleSelect(opt.value, currentQ.multi)}
                    >
                      <span>{opt.label}</span>
                      {selected && <Check size={18} />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <footer className="dashboard-onboarding-footer">
          <span className="step-indicator">
            {step + 1} de {questions.length}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!canAdvance() || saving}
          >
            {saving ? 'Salvando...' : step < questions.length - 1 ? 'Próximo' : 'Concluir'}
            <ChevronRight size={18} />
          </button>
        </footer>
      </div>
    </div>
  );
}
