import { useCallback, useEffect, useRef, useState } from 'react';
import { pulse } from '../../services/api';

const POLL_MS = 180000;
const DISMISS_KEY = 'impetus_pulse_dismiss_id';

/**
 * Gatilho ocasional: consulta /pulse/me/prompt em intervalo (sem item de menu fixo).
 */
export function useImpetusPulse() {
  const [promptOpen, setPromptOpen] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [motivation, setMotivation] = useState(null);
  const timer = useRef(null);

  const poll = useCallback(async () => {
    try {
      const token = localStorage.getItem('impetus_token');
      if (!token) return;
      const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
      const role = (user.role || '').toLowerCase();
      if (['ceo', 'diretor', 'admin', 'rh'].includes(role)) return;
      if (user.is_factory_team_account && !user.factory_active_member?.id) return;

      const r = await pulse.getMePrompt();
      const ev = r.data?.evaluation;
      const show = r.data?.show && ev?.id;
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (show && dismissed === ev.id) {
        setPromptOpen(false);
        return;
      }
      if (show) {
        setEvaluation(ev);
        setPromptOpen(true);
      } else {
        setPromptOpen(false);
        setEvaluation(null);
      }
    } catch (_) {
      /* silencioso — não bloqueia o app */
    }
  }, []);

  const loadMotivation = useCallback(async () => {
    try {
      const token = localStorage.getItem('impetus_token');
      if (!token) return;
      const user = JSON.parse(localStorage.getItem('impetus_user') || '{}');
      if (user.is_factory_team_account && !user.factory_active_member?.id) return;
      const d = new Date().getDay();
      if (d !== 1 && d !== 2) return;
      const wk = new Date().toISOString().slice(0, 10);
      if (sessionStorage.getItem(`pulse_mot_${wk}`)) return;
      const r = await pulse.getMotivation();
      const row = r.data?.pill;
      const text = row?.motivation_pill;
      if (text) {
        setMotivation(text);
        sessionStorage.setItem(`pulse_mot_${wk}`, '1');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    poll();
    loadMotivation();
    timer.current = setInterval(poll, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [poll, loadMotivation]);

  const closePrompt = () => {
    if (evaluation?.id) sessionStorage.setItem(DISMISS_KEY, evaluation.id);
    setPromptOpen(false);
  };

  const onSubmitted = () => {
    sessionStorage.removeItem(DISMISS_KEY);
    setPromptOpen(false);
    setEvaluation(null);
  };

  return {
    promptOpen,
    evaluation,
    closePrompt,
    onSubmitted,
    motivation,
    dismissMotivation: () => {
      try {
        sessionStorage.setItem(`pulse_mot_${new Date().toISOString().slice(0, 10)}`, '1');
      } catch (_) {}
      setMotivation(null);
    }
  };
}
