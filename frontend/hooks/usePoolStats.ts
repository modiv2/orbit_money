'use client';
import useSWR from 'swr';

export const usePoolStats = () => {
  const { data, isLoading, mutate } = useSWR(
    '/api/pool',
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 10000 }
  );

  return {
    tvl: data?.tvl || '0',
    volume24h: data?.volume24h || '0',
    apy: data?.apy || '0',
    xlmReserve: data?.xlmReserve || '0',
    agtReserve: data?.agtReserve || '0',
    isLoading,
    mutate,
  };
};
