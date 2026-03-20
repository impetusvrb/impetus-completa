import { useCallback, useEffect, useState } from 'react';

export function useAssetData() {
  const [twins, setTwins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Stub mínimo: módulo em desenvolvimento paralelo.
      setTwins([]);
      setOrders([]);
      setStock([]);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar dados de ativos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { twins, orders, stock, loading, error, reload };
}

