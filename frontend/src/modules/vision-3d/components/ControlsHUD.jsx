/**
 * IMPETUS - ManuIA 3D Vision - Botões 3D: xray, explode, wireframe, rotate, reset
 */
import React from 'react';
import { Scan, Expand, Grid3X3, RotateCw, RotateCcw } from 'lucide-react';
import styles from '../styles/Vision3D.module.css';

export default function ControlsHUD({ mode, autoRotate, explode, onModeChange, onAutoRotate, onExplode, onReset }) {
  return (
    <div className={styles.controlsHUD}>
      <button
        type="button"
        className={`${styles.hudBtn} ${mode === 'xray' ? styles['hudBtn--active'] : ''}`}
        onClick={() => onModeChange(mode === 'xray' ? 'normal' : 'xray')}
        title="Modo Raio-X"
      >
        <Scan size={14} /> Raio-X
      </button>
      <button
        type="button"
        className={`${styles.hudBtn} ${explode ? styles['hudBtn--active'] : ''}`}
        onClick={() => onExplode(!explode)}
        title="Vista Explodida"
      >
        <Expand size={14} /> Explodir
      </button>
      <button
        type="button"
        className={`${styles.hudBtn} ${mode === 'wireframe' ? styles['hudBtn--active'] : ''}`}
        onClick={() => onModeChange(mode === 'wireframe' ? 'normal' : 'wireframe')}
        title="Wireframe"
      >
        <Grid3X3 size={14} /> Wire
      </button>
      <button
        type="button"
        className={`${styles.hudBtn} ${autoRotate ? styles['hudBtn--active'] : ''}`}
        onClick={() => onAutoRotate(!autoRotate)}
        title="Auto-rotacionar"
      >
        <RotateCw size={14} /> Rotar
      </button>
      <button type="button" className={styles.hudBtn} onClick={onReset} title="Reset câmera">
        <RotateCcw size={14} /> Reset
      </button>
    </div>
  );
}
