'use client';
import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import {
  isConnected as freighterIsConnected,
  isAllowed,
  requestAccess,
  getPublicKey,
  getNetworkDetails,
} from '@stellar/freighter-api';

let sessionCheckInitiated = false;

export const useFreighter = () => {
  // Use SWR as a lightweight global state manager
  const { data: publicKey = '', mutate: setPublicKey } = useSWR<string>('freighter_pk');
  const { data: connected = false, mutate: setConnected } = useSWR<boolean>('freighter_connected');
  const { data: network = 'TESTNET', mutate: setNetwork } = useSWR<'TESTNET' | 'PUBLIC'>('freighter_network');
  
  const [error, setError]           = useState<string | null>(null);
  const [isLoading, setIsLoading]   = useState<boolean>(false);

  /** On mount: silently restore session if site is already allowed. */
  const checkSession = useCallback(async () => {
    if (sessionCheckInitiated || connected) return;
    sessionCheckInitiated = true;
    
    // Check if user manually disconnected
    if (typeof window !== 'undefined' && localStorage.getItem('orbit_disconnected') === 'true') {
      return;
    }

    try {
      const connResult: any = await freighterIsConnected();
      const installed = connResult?.isConnected ?? !!connResult;
      if (!installed) return;

      const allowResult: any = await isAllowed();
      const allowed = allowResult?.isAllowed ?? !!allowResult;
      if (!allowed) return;

      // Site is already trusted — silently fetch the key
      const pk = await getPublicKey();
      if (pk) {
        setPublicKey(pk);
        setConnected(true);
        // Fetch the actual network
        try {
          const details = await getNetworkDetails();
          if (details?.networkPassphrase?.includes('Test SDF')) {
            setNetwork('TESTNET');
          } else {
            setNetwork('PUBLIC');
          }
        } catch { /* ignore */ }
      }
    } catch (err) {
      console.debug('[useFreighter] session check:', err);
    }
  }, [connected, setPublicKey, setConnected, setNetwork]);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  /** User-triggered connect: prompts Freighter permission popup. */
  const connect = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('orbit_disconnected');
    }
    
    try {
      // 1. Check extension is installed
      const connResult: any = await freighterIsConnected();
      const installed = connResult?.isConnected ?? !!connResult;
      if (!installed) {
        setError('Freighter extension is not installed. Get it at freighter.app');
        return;
      }

      // 2. requestAccess() opens the Freighter popup
      const accessResult = await requestAccess();
      const pk: string = (accessResult as { publicKey?: string })?.publicKey
        ?? (accessResult as unknown as string);

      if (!pk) {
        setError('Connection rejected — please approve in Freighter');
        return;
      }

      setPublicKey(pk);
      setConnected(true);

      // 3. Detect network
      try {
        const details = await getNetworkDetails();
        setNetwork(
          details?.networkPassphrase?.includes('Test SDF') ? 'TESTNET' : 'PUBLIC'
        );
      } catch { /* fallback */ }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || 'Failed to connect to Freighter');
    } finally {
      setIsLoading(false);
    }
  }, [setPublicKey, setConnected, setNetwork]);

  const disconnect = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('orbit_disconnected', 'true');
    }
    setPublicKey('');
    setConnected(false);
    setError(null);
  }, [setPublicKey, setConnected]);

  return {
    publicKey,
    isConnected: connected,
    connect,
    disconnect,
    network,
    error,
    isLoading,
  };
};
