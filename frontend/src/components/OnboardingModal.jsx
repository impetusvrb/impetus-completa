import React from 'react';

export default function OnboardingModal({ show, tipo, onComplete }) {
  if (!show) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', padding: 24, borderRadius: 12, maxWidth: 400 }}>
        <h3>Onboarding</h3>
        <p>Complete a configuração inicial.</p>
        <button type="button" onClick={onComplete}>Continuar</button>
      </div>
    </div>
  );
}
