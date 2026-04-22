'use client';
import useSWR from 'swr';

export const useAGTPrice = () => {
  const { data, isLoading } = useSWR(
    '/api/price',
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 5000 }
  );

  return {
    price: data?.price || '0.00',
    change24h: data?.change24h || '0.00',
    isLoading,
  };
};
