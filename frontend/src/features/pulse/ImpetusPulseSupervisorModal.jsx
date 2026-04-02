/**
 * Complemento de percepção do líder — sem acesso às notas do colaborador (blind).
 */
import React, { useEffect, useState } from 'react';
import Modal from '../../components/Modal';
import { pulse } from '../../services/api';
import './ImpetusPulseModal.css';

export default function ImpetusPulseSupervisorModal({ item, isOpen, onClose, onDone }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    setText('');
    setErr(null);
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const submit = async () => {
    setSaving(true);
    setErr(null);
    try {
      await pulse.postSupervisorPerception(item.id, text);
      onDone?.();
      onClose();
    } catch (e) {
      setErr(e.apiMessage || e.message || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Avaliação complementar de percepção" size="medium">
      <p className="pulse-modal__intro">
        <strong>{item.user_name}</strong> concluiu a autoavaliação Impetus Pulse. Registre sua percepção sobre o desempenho
        deste colaborador neste período. Você <strong>não</strong> tem acesso às notas ou respostas individuais dele — apenas
        este campo livre.
      </p>
      <label className="form-label" htmlFor="pulse-sup-text">
        Sua percepção (mín. 10 caracteres)
      </label>
      <textarea
        id="pulse-sup-text"
        className="form-textarea"
        rows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex.: Consistência nas passagens de informação, apoio ao time, oportunidades de desenvolvimento..."
      />
      {err && <p className="pulse-modal__err">{err}</p>}
      <div className="pulse-modal__footer pulse-modal__footer--split">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-primary" disabled={saving || text.trim().length < 10} onClick={submit}>
          {saving ? 'Salvando…' : 'Enviar percepção'}
        </button>
      </div>
    </Modal>
  );
}
