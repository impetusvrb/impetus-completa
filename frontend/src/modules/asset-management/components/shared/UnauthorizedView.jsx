import React from 'react';
import { ShieldX } from 'lucide-react';
import styles from '../../styles/AssetManagement.module.css';

export default function UnauthorizedView() {
  return (
    <div className={styles.unauthorized}>
      <ShieldX size={48} className={styles.unauthorized__icon} />
      <h2 className={styles.unauthorized__title}>Acesso não autorizado</h2>
      <p className={styles.unauthorized__desc}>
        O módulo Gestão de Ativos é exclusivo para o Departamento de Manutenção.
      </p>
    </div>
  );
}
