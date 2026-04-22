import { NextResponse } from 'next/server';

const HORIZON = 'https://horizon-testnet.stellar.org';
const ISSUER = process.env.STELLAR_ISSUER_PUBLIC || '';

export async function GET() {
  try {
    const url = `${HORIZON}/order_book?selling_asset_type=credit_alphanum4&selling_asset_code=AGT&selling_asset_issuer=${ISSUER}&buying_asset_type=native&limit=1`;
    const res = await fetch(url, { next: { revalidate: 5 } });
    const data = await res.json();

    const bestBid = data.bids?.[0]?.price || '0';
    const bestAsk = data.asks?.[0]?.price || '0';
    const price = bestBid !== '0' ? bestBid : bestAsk;

    return NextResponse.json({
      price: parseFloat(price).toFixed(6),
      change24h: '0.00',
    });
  } catch {
    return NextResponse.json({ price: '0.000000', change24h: '0.00' });
  }
}
