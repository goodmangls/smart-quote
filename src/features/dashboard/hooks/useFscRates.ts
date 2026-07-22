import { useState, useEffect, useCallback } from 'react';
import { getFscRates, type FscRates } from '@/api/fscApi';
import {
  DEFAULT_FSC_PERCENT,
  DEFAULT_FSC_PERCENT_DHL,
  DEFAULT_FSC_PERCENT_FEDEX,
} from '@/config/rates';

const DEFAULT_FSC_RATES: FscRates = {
  rates: {
    UPS: { international: DEFAULT_FSC_PERCENT, domestic: DEFAULT_FSC_PERCENT },
    DHL: { international: DEFAULT_FSC_PERCENT_DHL, domestic: DEFAULT_FSC_PERCENT_DHL },
    FEDEX: { international: DEFAULT_FSC_PERCENT_FEDEX, domestic: DEFAULT_FSC_PERCENT_FEDEX },
  },
  updatedAt: new Date().toISOString(),
};

export function useFscRates() {
  const [data, setData] = useState<FscRates>(DEFAULT_FSC_RATES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFscRates();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'FSC 요율 조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  return { data, loading, error, retry: fetchRates };
}
