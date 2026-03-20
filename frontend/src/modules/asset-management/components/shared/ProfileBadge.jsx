import React from 'react';
import { PROFILE_LABELS } from '../../constants/profileConfig';
import styles from '../../styles/AssetManagement.module.css';

export default function ProfileBadge({ profile }) {
  const label = PROFILE_LABELS[profile] || profile;
  return <span className={`${styles.profileBadge} ${styles[`profileBadge--${profile}`] || ''}`}>{label}</span>;
}
