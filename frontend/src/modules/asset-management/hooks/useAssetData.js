import { useCallback, useEffect, useState } from 'react';
import { assetApi } from '../services/assetApi';

export function useAssetData(departmentId) {
  const [twins, setTwins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [twRes, ordRes, stRes] = await Promise.all([
        assetApi.getTwins(departmentId),
        assetApi.getOrders(departmentId ? { department_id: departmentId } : {}),
        assetApi.getStock(departmentId ? { department_id: departmentId } : {})
      ]);

      const twinPayload = twRes?.data?.twins ?? twRes?.data ?? [];
      setTwins(Array.isArray(twinPayload) ? twinPayload : []);

      const orderPayload = ordRes?.data?.orders ?? ordRes?.data ?? [];
      setOrders(Array.isArray(orderPayload) ? orderPayload : []);

      const stockPayload = stRes?.data?.items ?? stRes?.data?.stock ?? [];
      setStock(Array.isArray(stockPayload) ? stockPayload : []);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar dados de ativos.');
      setTwins([]);
      setOrders([]);
      setStock([]);
    } finally {
      setLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { twins, orders, stock, loading, error, reload };
}
