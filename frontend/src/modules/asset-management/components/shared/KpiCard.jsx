import React from 'react';
import styles from '../../styles/AssetManagement.module.css';

export default function KpiCard({ title, value, subtitle, trend, icon: Icon }) {
  return (
    <div className={styles.kpiCard}>
      {Icon && <div className={styles.kpiCard__icon}><Icon size={24} /></div>}
      <div className={styles.kpiCard__content}>
        <span className={styles.kpiCard__title}>{title}</span>
        <span className={styles.kpiCard__value}>{value}</span>
        {subtitle && <span className={styles.kpiCard__subtitle}>{subtitle}</span>}
        {trend !== undefined && (
          <span className={`${styles.kpiCard__trend} ${trend >= 0 ? styles['kpiCard__trend--up'] : styles['kpiCard__trend--down']}`}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
    </div>
  );
}
