import React from 'react';
import { Sparkles } from 'lucide-react';
import styles from '../../styles/AssetManagement.module.css';

const TYPE_CLASS = { critical: styles['aiInsight--critical'], warning: styles['aiInsight--warning'], opportunity: styles['aiInsight--opportunity'], result: styles['aiInsight--result'] };

export default function AiInsightBanner({ type = 'info', title, description, estimatedValue }) {
  return (
    <div className={`${styles.aiInsight} ${TYPE_CLASS[type] || ''}`}>
      <div className={styles.aiInsight__icon}><Sparkles size={18} /></div>
      <div className={styles.aiInsight__content}>
        <strong className={styles.aiInsight__title}>{title}</strong>
        <p className={styles.aiInsight__desc}>{description}</p>
        {estimatedValue && <span className={styles.aiInsight__value}>{estimatedValue}</span>}
      </div>
    </div>
  );
}
