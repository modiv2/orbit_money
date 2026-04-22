'use client';
import { useState, useEffect } from 'react';
import { getPublicKey, isConnected } from '@stellar/freighter-api';
import { safeStellarCall } from '@/lib/safeStellarCall';

export const useFreighter = () => {
  const [publicKey, setPublicKey] = useState<string>('');
  const [connected, setConnected] = useState<boolean>(false);
  const [network] = useState<'TESTNET' | 'PUBLIC'>('TESTNET');
  const [error, setError] = useState<string | null>(null);

  const checkConnection = async () => {
    const { data: connectedStatus } = await safeStellarCall(
      () => isConnected(),
      'useFreighter/isConnected'
    );
    if (connectedStatus) {
      const { data: pk } = await safeStellarCall(
        () => getPublicKey(),
        'useFreighter/getPublicKey'
      );
      if (pk) {
        setPublicKey(pk);
        setConnected(true);
      }
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const connect = async () => {
    setError(null);
    const { data: pk, error: err } = await safeStellarCall(
      () => getPublicKey(),
      'useFreighter/connect'
    );
    if (pk) {
      setPublicKey(pk);
      setConnected(true);
    } else if (err) {
      setError(err);
    }
  };

  const disconnect = () => {
    setPublicKey('');
    setConnected(false);
    setError(null);
  };

  return {
    publicKey,
    isConnected: connected,
    connect,
    disconnect,
    network,
    error,
  };
};
