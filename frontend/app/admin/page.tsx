'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Coins, Droplets, Loader2, CheckCircle2,
  XCircle, Lock, ExternalLink, RefreshCw, AlertTriangle,
} from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';

const ADMIN_WALLETS = [
  'GBD43HIKH233XQ5K2FHCXASYP62243AUONKDRB3G2UTHK3R35PDZBXCX',
  'GCKQMQVZN5A6QMQCVKQ4SX335HLUW4N7ETXK34IOOMZOIQ2TLFF2FNLG',
  'GAV7DLBH6F3P5OU4GD3YVSZZ3DHRXGA2D6ORQBN4XSL63J4WD3H2SUSG',
];
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';
const HORIZON_URL        = 'https://horizon-testnet.stellar.org';
const RPC_URL            = process.env.NEXT_PUBLIC_SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const POOL_CONTRACT      = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS || '';

type TxResult = { ok: boolean; hash?: string; error?: string; sourceLabel?: string; sourceAccount?: string };

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ result }: { result: TxResult | null }) {
  if (!result) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      style={{
        marginTop: 12, padding: '12px 16px', borderRadius: 12, fontSize: 13,
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${result.ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'}`,
        color: result.ok ? 'var(--success)' : 'var(--error)',
      }}
    >
      {result.ok
        ? <>
            <CheckCircle2 size={15} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Confirmed —&nbsp;
                <a href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  {result.hash?.slice(0, 14)}… <ExternalLink size={11} />
                </a>
              </div>
              {result.sourceLabel && (
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  Source: <strong>{result.sourceLabel}</strong>
                  {result.sourceAccount && ` (${result.sourceAccount.slice(0,6)}…${result.sourceAccount.slice(-4)})`}
                </div>
              )}
            </div>
          </>
        : <><XCircle size={15} />{result.error}</>}
    </motion.div>
  );
}

// ─── Shared Soroban Invocation Helper ─────────────────────────────────────────
async function sorobanInvokeV2(publicKey: string, contractId: string, fn: string, args: any[]): Promise<TxResult> {
  let step = 'init';
  try {
    const { Contract, TransactionBuilder, Horizon, SorobanRpc } = await import('@stellar/stellar-sdk');
    const { signTransaction } = await import('@stellar/freighter-api');

    const server  = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
    const horizon = new Horizon.Server(HORIZON_URL);
    const account = await horizon.loadAccount(publicKey);
    const op      = new Contract(contractId).call(fn, ...args);

    step = 'building tx';
    let tx = new TransactionBuilder(account, { fee: '100000', networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(op).setTimeout(180).build();
    
    step = 'prepareTransaction';
    tx = await server.prepareTransaction(tx);

    step = 'signTransaction';
    const signed = await signTransaction(tx.toXDR(), { networkPassphrase: NETWORK_PASSPHRASE });
    const xdrStr = typeof signed === 'string' ? signed : (signed as any)?.signedTxXdr ?? '';
    if (!xdrStr) throw new Error('Freighter cancelled');

    step = 'fromXDR';
    const finalTx  = TransactionBuilder.fromXDR(xdrStr, NETWORK_PASSPHRASE);
    
    step = 'sendTransaction';
    const response = await server.sendTransaction(finalTx);
    if (response.status === 'ERROR') throw new Error('Transaction rejected on-chain');

    step = 'waiting';
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 4000));
      // Manually fetch to bypass SDK 11.3.0 XDR parsing bugs on Protocol 21+ Testnet
      const res = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: { hash: response.hash } })
      });
      const data = await res.json();
      const status = data?.result?.status;
      if (status && status !== 'NOT_FOUND') {
        if (status === 'FAILED') {
          throw new Error('Transaction failed on-chain (check balances and trustlines)');
        }
        break;
      }
    }
    return { ok: true, hash: response.hash };
  } catch (e: any) {
    return { ok: false, error: `[${step}] ${e.message || String(e)}` };
  }
}

// ─── Mint Card — uses server-side API (issuer signs) ─────────────────────────
function MintCard({ publicKey }: { publicKey: string }) {
  const [recipient, setRecipient] = useState(publicKey);
  const [amount, setAmount]       = useState('');
  const [busy, setBusy]           = useState(false);
  const [result, setResult]       = useState<TxResult | null>(null);

  const mint = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setBusy(true); setResult(null);
    try {
      const res  = await fetch('/api/admin/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, amount, callerPubKey: publicKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Mint failed');
      setResult({ ok: true, hash: data.hash });
    } catch (e: any) {
      setResult({ ok: false, error: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Coins size={18} style={{ color: 'var(--accent)' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Mint AGT</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Issue AGT — signed by issuer server-side</p>
        </div>
      </div>

      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Recipient Address</label>
      <input value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="G..."
        style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 13, fontFamily: 'monospace', outline: 'none', marginBottom: 12 }}
      />

      <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>Amount (AGT)</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 16, outline: 'none' }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          {[100, 1000, 10000].map(v => (
            <button key={v} onClick={() => setAmount(String(v))}
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, padding: '0 10px', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 12, minHeight: 42 }}>
              {v.toLocaleString()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 10, fontSize: 12, background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)', color: 'rgba(200,180,255,0.7)' }}>
        ℹ️ Recipient must have the AGT trustline in Freighter before receiving tokens.
      </div>

      <button className="btn-primary" onClick={mint} disabled={busy || !amount}
        style={{ width: '100%', marginTop: 14, minHeight: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Minting…</> : `Mint ${amount || '0'} AGT`}
      </button>

      <AnimatePresence>{result && <StatusBadge result={result} />}</AnimatePresence>
    </div>
  );
}

// ─── Seed Liquidity Card ──────────────────────────────────────────────────────
function SeedLiquidityCard({ publicKey }: { publicKey: string }) {
  const [agtAmt, setAgtAmt] = useState('');
  const [xlmAmt, setXlmAmt] = useState('');
  const [busy, setBusy]     = useState(false);
  const [result, setResult] = useState<TxResult | null>(null);

  const implied = agtAmt && xlmAmt ? (parseFloat(xlmAmt) / parseFloat(agtAmt)).toFixed(6) : null;

  const seed = async () => {
    if (!agtAmt || !xlmAmt) return;
    setBusy(true); setResult(null);
    try {
      const { Address, xdr } = await import('@stellar/stellar-sdk');

      // Force strictly i128 XDR to avoid any browser nativeToScVal type 4 (i32) bugs
      const toI128 = (stroops: number) => xdr.ScVal.scvI128(new xdr.Int128Parts({
        hi: new xdr.Int64(0),
        lo: xdr.Uint64.fromString(stroops.toString())
      }));

      const res = await sorobanInvokeV2(publicKey, POOL_CONTRACT, 'add_liquidity', [
        new Address(publicKey).toScVal(),
        toI128(Math.floor(parseFloat(agtAmt) * 1e7)),
        toI128(Math.floor(parseFloat(xlmAmt) * 1e7)),
      ]);
      setResult(res);
    } catch (e: any) {
      setResult({ ok: false, error: e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.2)', border: '1px solid rgba(59,130,246,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Droplets size={18} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 2 }}>Seed Liquidity</h2>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Add AGT + XLM to the pool (your wallet signs)</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {[{ label: 'AGT Amount', val: agtAmt, set: setAgtAmt }, { label: 'XLM Amount', val: xlmAmt, set: setXlmAmt }].map(({ label, val, set }) => (
          <div key={label}>
            <label style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 6 }}>{label}</label>
            <input type="number" value={val} onChange={e => set(e.target.value)} placeholder="0"
              style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--card-border)', borderRadius: 10, padding: '10px 14px', color: 'white', fontSize: 16, outline: 'none' }}
            />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[{ l: '1k / 100', a: '1000', x: '100' }, { l: '10k / 1k', a: '10000', x: '1000' }, { l: '100k / 4k', a: '100000', x: '4000' }].map(p => (
          <button key={p.l} onClick={() => { setAgtAmt(p.a); setXlmAmt(p.x); }}
            style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: 12, minHeight: 34 }}>
            {p.l}
          </button>
        ))}
      </div>

      {implied && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, fontSize: 13, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}>Implied price</span>
          <span>1 AGT = <strong>{implied} XLM</strong></span>
        </motion.div>
      )}

      <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, fontSize: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', display: 'flex', alignItems: 'flex-start', gap: 8, color: 'rgba(255,200,100,0.8)' }}>
        <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        Your wallet needs an AGT trustline + enough XLM balance before seeding.
      </div>

      <button className="btn-primary" onClick={seed} disabled={busy || !agtAmt || !xlmAmt}
        style={{ width: '100%', minHeight: 48, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        {busy ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Seeding…</> : <><Droplets size={16} />Seed {agtAmt || '0'} AGT + {xlmAmt || '0'} XLM</>}
      </button>

      <AnimatePresence>{result && <StatusBadge result={result} />}</AnimatePresence>
    </div>
  );
}

// ─── Pool Stats ───────────────────────────────────────────────────────────────
function PoolStatsCard() {
  const [stats, setStats]     = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try { setStats(await (await fetch('/api/pool')).json()); } catch { /* */ } finally { setLoading(false); }
  };

  return (
    <div className="glass-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700 }}>Pool State</h2>
        <button onClick={refresh} style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: 8, cursor: 'pointer', color: 'white', padding: '6px 10px', minHeight: 36 }}>
          {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={14} />}
        </button>
      </div>
      {!stats && !loading && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '16px 0' }}>Click refresh to load pool stats</p>}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'AGT Reserve', val: parseFloat(stats.agtReserve ?? 0).toLocaleString(), unit: 'AGT' },
            { label: 'XLM Reserve', val: parseFloat(stats.xlmReserve ?? 0).toLocaleString(), unit: 'XLM' },
            { label: 'Price',       val: stats.price ?? '—', unit: 'XLM/AGT' },
            { label: 'Providers',   val: stats.providers ?? '—', unit: '' },
          ].map(({ label, val, unit }) => (
            <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: 18, fontWeight: 700 }}>{val} <span style={{ fontSize: 12, color: 'var(--accent)' }}>{unit}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { isConnected, connect, publicKey, isLoading } = useFreighter();
  const isAdmin = isConnected && ADMIN_WALLETS.includes(publicKey);

  if (!isConnected) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px', background: 'linear-gradient(135deg,rgba(139,92,246,.3),rgba(99,102,241,.3))', border: '1px solid rgba(139,92,246,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={32} style={{ color: 'var(--accent)' }} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Admin Panel</h1>
        <p style={{ color: 'rgba(255,255,255,.5)', marginBottom: 28, lineHeight: 1.6 }}>Connect your admin wallet to access controls.</p>
        <button className="btn-primary" onClick={connect} disabled={isLoading} style={{ padding: '14px 32px', fontSize: 16, minHeight: 52 }}>
          {isLoading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />Connecting…</> : 'Connect Wallet'}
        </button>
      </motion.div>
    </main>
  );

  if (!isAdmin) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px', background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <XCircle size={32} style={{ color: 'var(--error)' }} />
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 10 }}>Access Denied</h1>
        <p style={{ color: 'rgba(255,255,255,.5)', lineHeight: 1.6 }}>
          Wallet <code style={{ fontSize: 12 }}>{publicKey.slice(0,6)}…{publicKey.slice(-4)}</code> is not authorized.
        </p>
      </motion.div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', padding: '40px 16px 80px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,rgba(139,92,246,.4),rgba(99,102,241,.4))', border: '1px solid rgba(139,92,246,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>Admin Panel</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)' }} />
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', fontFamily: 'monospace' }}>{publicKey.slice(0,8)}…{publicKey.slice(-6)} · Admin</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px,1fr))', gap: 20 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <MintCard publicKey={publicKey} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SeedLiquidityCard publicKey={publicKey} />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ gridColumn: '1 / -1' }}>
            <PoolStatsCard />
          </motion.div>
        </div>
      </div>
    </main>
  );
}
