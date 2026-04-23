import { NextResponse } from 'next/server';
import { execSync }       from 'child_process';
import path               from 'path';

const ADMIN_WALLETS = [
  'GBD43HIKH233XQ5K2FHCXASYP62243AUONKDRB3G2UTHK3R35PDZBXCX',
  'GCKQMQVZN5A6QMQCVKQ4SX335HLUW4N7ETXK34IOOMZOIQ2TLFF2FNLG',
  'GAV7DLBH6F3P5OU4GD3YVSZZ3DHRXGA2D6ORQBN4XSL63J4WD3H2SUSG',
];
const POOL_CONTRACT = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS!;
const STELLAR_BIN   = path.join(process.cwd(), '..', 'bin', 'stellar');

// Try to use admin's own keypair; fall back to distributor
const ADMIN_SECRET     = process.env.STELLAR_ADMIN_SECRET;
const ADMIN_PUBLIC     = process.env.STELLAR_ADMIN_PUBLIC || ADMIN_WALLETS[0];
const DIST_SECRET      = process.env.STELLAR_DISTRIBUTOR_SECRET!;
const DIST_PUBLIC      = process.env.STELLAR_DISTRIBUTOR_PUBLIC!;

const useAdminWallet = !!(ADMIN_SECRET && ADMIN_SECRET.trim().length > 0);
const signerSecret   = useAdminWallet ? ADMIN_SECRET! : DIST_SECRET;
const signerPublic   = useAdminWallet ? ADMIN_PUBLIC  : DIST_PUBLIC;

function stellar(subCmd: string): string {
  return execSync(`${STELLAR_BIN} ${subCmd}`, {
    encoding: 'utf8',
    stdio:    ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      STELLAR_NETWORK: 'testnet',
      STELLAR_RPC_URL: 'https://soroban-testnet.stellar.org',
      STELLAR_NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
    },
  }).trim();
}

export async function POST(req: Request) {
  try {
    const { agtAmount, xlmAmount, callerPubKey } = await req.json();

    if (!ADMIN_WALLETS.includes(callerPubKey)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!agtAmount || !xlmAmount || parseFloat(agtAmount) <= 0 || parseFloat(xlmAmount) <= 0) {
      return NextResponse.json({ error: 'Invalid amounts' }, { status: 400 });
    }
    if (!signerSecret || !POOL_CONTRACT) {
      return NextResponse.json({
        error: useAdminWallet
          ? 'STELLAR_ADMIN_SECRET is empty in .env.local'
          : 'Server not configured (missing DISTRIBUTOR_SECRET or POOL_CONTRACT)',
      }, { status: 500 });
    }

    const tokenStroops = String(Math.floor(parseFloat(agtAmount) * 1e7));
    const xlmStroops   = String(Math.floor(parseFloat(xlmAmount)  * 1e7));

    const result = stellar(
      `contract invoke` +
      ` --id ${POOL_CONTRACT}` +
      ` --source-account ${signerSecret}` +
      ` --inclusion-fee 100000` +
      ` --send=yes` +
      ` -- add_liquidity` +
      ` --provider ${signerPublic}` +
      ` --token_amount ${tokenStroops}` +
      ` --xlm_amount ${xlmStroops}`
    );

    const hashFromUrl = result.match(/tx\/([a-f0-9]{64})/i)?.[1];
    const hashRaw     = result.match(/^([a-f0-9]{64})/im)?.[1];
    const hash        = hashFromUrl ?? hashRaw ?? '';

    return NextResponse.json({
      hash,
      sourceAccount: signerPublic,
      sourceLabel: useAdminWallet ? 'Your wallet' : 'Distributor (protocol reserves)',
    });
  } catch (err: any) {
    const raw = err?.stderr || err?.stdout || err?.message || String(err);
    // Extract a human-readable error from the CLI output
    const match = raw.match(/error: (.+)/i) || raw.match(/Error: (.+)/i);
    const msg   = match?.[1] ?? raw;
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
