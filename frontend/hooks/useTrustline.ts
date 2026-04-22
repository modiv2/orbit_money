'use client';
import useSWR from 'swr';
import { useState } from 'react';

export const useTrustline = (publicKey: string) => {
  const { data, mutate, isLoading } = useSWR(
    publicKey ? `/api/balance/${publicKey}` : null,
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 5000 }
  );

  const [isAdding, setIsAdding] = useState(false);

  const addTrustline = async (userSecret?: string) => {
    setIsAdding(true);
    try {
      const res = await fetch('/api/trustline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicKey, userSecret }),
      });
      const result = await res.json();
      await mutate();
      return result.txHash;
    } catch (error) {
      console.error('Failed to add trustline:', error);
    } finally {
      setIsAdding(false);
    }
  };

  return {
    hasTrustline: data?.hasTrustline || false,
    agtBalance: data?.agtBalance || '0',
    agtLimit: data?.agtLimit || '0',
    isLoading,
    isAdding,
    addTrustline,
  };
};
