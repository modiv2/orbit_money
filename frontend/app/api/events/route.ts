import { NextResponse } from 'next/server';

const HORIZON = 'https://horizon-testnet.stellar.org';
const CONTRACT = process.env.POOL_CONTRACT_ADDRESS || '';

function mapOpToEvent(op: Record<string, unknown>, idx: number) {
  const type = op.type as string;
  const eventType = type === 'payment' ? 'swap'
    : type === 'change_trust' ? 'trustline'
    : type === 'invoke_host_function' ? 'swap'
    : 'swap';

  return {
    id: `${op.transaction_hash as string}-${idx}`,
    type: eventType,
    from: (op.from as string) || (op.source_account as string) || '',
    to: (op.to as string) || '',
    amount: (op.amount as string) || '0',
    txHash: op.transaction_hash as string || '',
    ledger: (op.transaction?.ledger as number) || 0,
    timestamp: (op.created_at as string) || new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const url = CONTRACT
      ? `${HORIZON}/accounts/${CONTRACT}/transactions?limit=20&order=desc`
      : `${HORIZON}/transactions?limit=20&order=desc`;

    const res = await fetch(url, { next: { revalidate: 2 } });
    const data = await res.json();
    const records: Record<string, unknown>[] = data._embedded?.records || [];

    const events = records.flatMap((tx: Record<string, unknown>, i: number) => [
      mapOpToEvent(tx, i),
    ]);

    return NextResponse.json({ events });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
