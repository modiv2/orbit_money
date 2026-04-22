'use client';
import useSWR from 'swr';

export const useAGTBalance = (publicKey: string) => {
  const { data, isLoading } = useSWR(
    publicKey ? `/api/balance/${publicKey}` : null,
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 8000 }
  );

  return {
    agtBalance: data?.agtBalance || '0',
    xlmBalance: data?.xlmBalance || '0',
    hasTrustline: data?.hasTrustline || false,
    isLoading,
  };
};
