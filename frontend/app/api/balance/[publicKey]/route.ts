import { NextResponse } from 'next/server';

const HORIZON = 'https://horizon-testnet.stellar.org';
const ISSUER = process.env.STELLAR_ISSUER_PUBLIC || '';

export async function GET(
  _request: Request,
  { params }: { params: { publicKey: string } }
) {
  const { publicKey } = params;

  try {
    const res = await fetch(`${HORIZON}/accounts/${publicKey}`, {
      next: { revalidate: 8 },
    });

    if (!res.ok) {
      return NextResponse.json({ agtBalance: '0', xlmBalance: '0', hasTrustline: false });
    }

    const account = await res.json();
    const balances: Array<{
      asset_type: string;
      asset_code?: string;
      asset_issuer?: string;
      balance: string;
      limit?: string;
    }> = account.balances || [];

    const xlmBal = balances.find((b) => b.asset_type === 'native');
    const agtBal = balances.find(
      (b) => b.asset_code === 'AGT' && b.asset_issuer === ISSUER
    );

    return NextResponse.json({
      agtBalance: agtBal?.balance || '0',
      agtLimit: agtBal?.limit || '0',
      xlmBalance: xlmBal?.balance || '0',
      hasTrustline: !!agtBal,
    });
  } catch {
    return NextResponse.json({ agtBalance: '0', xlmBalance: '0', hasTrustline: false });
  }
}
