import { useCallback } from 'react';
import { useCachedFetch } from '../../../hooks/useCachedFetch';
import { assetApi } from '../services/assetApi';

const TTL_MS = 90 * 1000; // 90 segundos — dados de ativos mudam em minutos

export function useAssetData(departmentId) {
  const cacheKey = `asset:${departmentId || 'all'}`;

  const { data, loading, error, refetch } = useCachedFetch(
    cacheKey,
    useCallback(async () => {
      const [twinsRes, ordersRes, stockRes] = await Promise.all([
        assetApi.getTwins(departmentId),
        assetApi.getOrders({ department_id: departmentId }),
        assetApi.getStock({ department_id: departmentId })
      ]);
      return {
        twins: twinsRes?.data?.twins ?? [],
        orders: ordersRes?.data?.orders ?? [],
        stock: stockRes?.data?.items ?? []
      };
    }, [departmentId]),
    { ttlMs: TTL_MS }
  );

  const twins = data?.twins ?? [];
  const orders = data?.orders ?? [];
  const stock = data?.stock ?? [];

  const reload = useCallback(() => refetch(), [refetch]);

  return { twins, orders, stock, loading, error: error?.message || error, reload };
}

