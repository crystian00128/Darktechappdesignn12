import { useState, useEffect, useCallback, useRef } from 'react';
import { getUserCreator, repairLinks } from '../services/api';

interface Creator {
  username: string;
  name: string;
  photo: string;
  role: string;
  createdAt: string;
}

export function useUserCreator(username: string | null) {
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const retryCount = useRef(0);
  const maxInitialRetries = 5;

  const refetch = useCallback(() => {
    retryCount.current = 0;
    setRefreshKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCreator() {
      if (!username) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log('🔍 Buscando criador do usuário:', username);
        
        const response = await getUserCreator(username);
        console.log('✅ Resposta da API getUserCreator:', response);
        
        if (!cancelled) {
          if (response.success && response.creator) {
            console.log('🔗 Criador encontrado:', response.creator.username, '-', response.creator.name);
            setCreator(response.creator);
            retryCount.current = 0; // Reset retry counter
          } else {
            console.log('⚠️ Criador não encontrado, tentando repair-links...');
            setCreator(null);
            
            // Tentar reparar vínculos e buscar novamente
            if (retryCount.current < maxInitialRetries) {
              retryCount.current++;
              console.log(`🔄 Retry ${retryCount.current}/${maxInitialRetries}...`);
              
              try {
                await repairLinks();
                console.log('✅ Repair-links executado');
              } catch (_repairErr) {
                console.warn('⚠️ Erro no repair-links (não crítico)');
              }
              
              // Buscar novamente após repair
              const retryResponse = await getUserCreator(username);
              if (!cancelled && retryResponse.success && retryResponse.creator) {
                console.log('🔗 Criador encontrado após repair:', retryResponse.creator.username);
                setCreator(retryResponse.creator);
                retryCount.current = 0;
              }
            }
          }
        }
      } catch (err) {
        console.error('❌ Erro ao buscar criador:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
          setCreator(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCreator();
    
    return () => { cancelled = true; };
  }, [username, refreshKey]);

  // Auto-refresh a cada 10 segundos
  useEffect(() => {
    if (!username) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await getUserCreator(username);
        if (response.success && response.creator) {
          setCreator(prev => {
            // Só atualiza se houve mudança real
            if (!prev || prev.username !== response.creator.username) {
              console.log('🔄 Auto-refresh: criador atualizado ->', response.creator.username);
              return response.creator;
            }
            return prev;
          });
        }
      } catch (_err) {
        // silencioso
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [username]);

  // Retry rápido nos primeiros 30 segundos se não encontrar criador (para registros recentes)
  useEffect(() => {
    if (!username || creator) return;
    
    let retries = 0;
    const maxQuickRetries = 6;
    
    const quickInterval = setInterval(async () => {
      retries++;
      if (retries > maxQuickRetries) {
        clearInterval(quickInterval);
        return;
      }
      
      try {
        console.log(`⚡ Quick retry ${retries}/${maxQuickRetries} buscando criador...`);
        
        // Tentar repair primeiro
        if (retries <= 2) {
          try { await repairLinks(); } catch (_e) { /* ignore */ }
        }
        
        const response = await getUserCreator(username);
        if (response.success && response.creator) {
          console.log('✅ Quick retry encontrou criador:', response.creator.username);
          setCreator(response.creator);
          clearInterval(quickInterval);
        }
      } catch (_err) {
        // silencioso
      }
    }, 3000); // A cada 3 segundos nos primeiros 18 segundos
    
    return () => clearInterval(quickInterval);
  }, [username, creator]);

  return { creator, loading, error, refetch };
}