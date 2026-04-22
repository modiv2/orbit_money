'use client';
import useSWR from 'swr';

export interface ContractEvent {
  id: string;
  type: 'mint' | 'burn' | 'swap' | 'liquidity' | 'trustline' | 'fee';
  from: string;
  to?: string;
  amount: string;
  txHash: string;
  ledger: number;
  timestamp: string;
}

export const useContractEvents = () => {
  const { data, error, isLoading } = useSWR(
    '/api/events',
    (url) => fetch(url).then((res) => res.json()),
    { refreshInterval: 2000 }
  );

  return {
    events: (data?.events as ContractEvent[]) || [],
    isLoading,
    isError: error,
  };
};
