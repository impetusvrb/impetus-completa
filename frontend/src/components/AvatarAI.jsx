/**
 * AvatarAI - Avatar visual animado da IA
 * Estados: standby, listening, speaking
 */
import React from 'react';
import impetusIaAvatar from '../assets/impetus-ia-avatar.png';
import './AvatarAI.css';

export default function AvatarAI({ state = 'standby', size = 120 }) {
  return (
    <div 
      className={`avatar-ai avatar-ai--${state}`}
      style={{ width: size, height: size }}
      aria-label={`IA ${state === 'listening' ? 'ouvindo' : state === 'speaking' ? 'falando' : 'pronta'}`}
    >
      <div className="avatar-ai__face">
        <img 
          src={impetusIaAvatar} 
          alt="Impetus IA" 
          className="avatar-ai__img"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextElementSibling?.classList?.add('avatar-ai__fallback--show');
          }}
        />
        <div className="avatar-ai__fallback">
          <span className="avatar-ai__initial">I</span>
        </div>
      </div>
      <div className="avatar-ai__glow" />
    </div>
  );
}
