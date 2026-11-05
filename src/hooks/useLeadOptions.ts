import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import { LeadOption, OptionType, PermissionDef } from '../types';

type Grouped = Record<OptionType, LeadOption[]>;
const EMPTY: Grouped = { lead_source: [], designation: [] };

/**
 * Loads the admin-managed dropdown values (and the grantable permission catalog).
 * Pass includeInactive = true on the management screen (admin only).
 */
export function useLeadOptions(includeInactive = false) {
  const [options, setOptions] = useState<Grouped>(EMPTY);
  const [permissions, setPermissions] = useState<PermissionDef[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await api.get('/lead/options', { params: includeInactive ? { all: 1 } : {} });
      setOptions({ ...EMPTY, ...(res.data?.options || {}) });
      setPermissions(res.data?.permissions || []);
    } catch (e) {
      console.log('Failed to load dropdown options:', e);
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => { reload(); }, [reload]);

  return { options, permissions, loading, reload };
}
