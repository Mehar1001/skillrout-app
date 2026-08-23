import { useCallback, useEffect, useState } from 'react';
import { getVisit } from '../services/visits';
import { Visit } from '../types';

export const useVisit = (ownerId?: string | null, storeId?: string | null, visitId?: string) => {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!ownerId || !visitId) return;
    setLoading(true);
    setError('');
    try {
      const value = await getVisit(ownerId, storeId || undefined, visitId);
      if (!value) throw new Error('Visit not found.');
      setVisit(value);
    } catch (e: any) {
      setError(e.message || 'Unable to load the visit.');
    } finally {
      setLoading(false);
    }
  }, [ownerId, storeId, visitId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { visit, loading, error, refresh };
};
