import { useState, useEffect, useCallback, useRef } from 'react';
import { getLinkedVendors } from '../services/api';

export interface LinkedVendor {
  username: string;
  name: string;
  photo: string;
  role: string;
  createdAt: string;
  isOnline: boolean;
}

export function useLinkedVendors(username: string | null) {
  const [vendors, setVendors] = useState<LinkedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Initial load
  useEffect(() => {
    if (!username) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const res = await getLinkedVendors(username!);
        if (!cancelled && res.success) {
          setVendors(res.vendors || []);
        }
      } catch (err) {
        console.error('Erro ao buscar vendedores vinculados:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [username, refreshKey]);

  // Auto-refresh every 8s (for fast online status updates)
  useEffect(() => {
    if (!username) return;

    const interval = setInterval(async () => {
      try {
        const res = await getLinkedVendors(username);
        if (mountedRef.current && res.success) {
          setVendors(prev => {
            const newV = res.vendors || [];
            // Only update if something changed
            if (JSON.stringify(prev.map(v => v.username + v.isOnline)) !== JSON.stringify(newV.map((v: LinkedVendor) => v.username + v.isOnline))) {
              return newV;
            }
            return prev;
          });
        }
      } catch {
        // silent
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [username]);

  return { vendors, loading, refetch };
}
