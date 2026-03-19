import React from 'react';
import impetusIaAvatar from '../assets/impetus-ia-avatar.png';
import './ImpetusFloatButton.css';

export default function ImpetusFloatButton({ visible, pulse = false, label = 'Impetus', onClick }) {
  if (!visible) return null;
  return (
    <button
      type="button"
      className={`impetus-float ${pulse ? 'impetus-float--pulse' : ''}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <img className="impetus-float__img" src={impetusIaAvatar} alt="" aria-hidden="true" />
      <span className="impetus-float__glow" aria-hidden="true" />
    </button>
  );
}

