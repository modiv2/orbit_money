import { NextResponse } from 'next/server';

const HORIZON = 'https://horizon-testnet.stellar.org';
const ISSUER  = process.env.STELLAR_ISSUER_PUBLIC || process.env.NEXT_PUBLIC_AGT_ISSUER || '';

export async function GET(
  _request: Request,
  { params }: { params: { publicKey: string } }
) {
  const { publicKey } = params;

  try {
    // AGT is now a classic Stellar Asset (via SAC wrapper) — read everything from Horizon
    const res = await fetch(`${HORIZON}/accounts/${publicKey}`, { next: { revalidate: 5 } });

    if (!res.ok) {
      return NextResponse.json({ agtBalance: '0', xlmBalance: '0', hasTrustline: false, agtLimit: '0' });
    }

    const account = await res.json();
    const balances: any[] = account.balances || [];

    // XLM
    const xlmEntry = balances.find((b) => b.asset_type === 'native');
    const xlmBalance = xlmEntry?.balance ?? '0';

    // AGT (classic asset issued by ISSUER)
    const agtEntry = balances.find(
      (b) => b.asset_code === 'AGT' && b.asset_issuer === ISSUER
    );
    const hasTrustline = !!agtEntry;
    const agtBalance   = agtEntry?.balance ?? '0';
    const agtLimit     = agtEntry?.limit   ?? '0';

    return NextResponse.json({ agtBalance, xlmBalance, hasTrustline, agtLimit });
  } catch (err) {
    console.error('Balance route error', err);
    return NextResponse.json({ agtBalance: '0', xlmBalance: '0', hasTrustline: false, agtLimit: '0' });
  }
}
