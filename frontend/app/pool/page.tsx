'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle, MinusCircle, Loader2, Droplets } from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';
import { useAGTBalance } from '@/hooks/useAGTBalance';
import { usePoolStats } from '@/hooks/usePoolStats';
import { BottomNav } from '@/components/BottomNav';

export default function PoolPage() {
  const { isConnected, connect, publicKey } = useFreighter();
  const { agtBalance, xlmBalance } = useAGTBalance(publicKey);
  const { tvl, xlmReserve, agtReserve, apy, isLoading } = usePoolStats();
  const [tab, setTab] = useState<'add' | 'remove'>('add');
  const [agtAmt, setAgtAmt] = useState('');
  const [xlmAmt, setXlmAmt] = useState('');
  const [lpAmt, setLpAmt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const agtReserveNum = parseFloat(agtReserve) || 1;
  const xlmReserveNum = parseFloat(xlmReserve) || 1;
  const ratio = xlmReserveNum / agtReserveNum;

  const handleAgtChange = (v: string) => {
    setAgtAmt(v);
    if (v) setXlmAmt((parseFloat(v) * ratio).toFixed(6));
  };

  const submit = async () => {
    if (!isConnected) return connect();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSuccessMsg(tab === 'add' ? 'Liquidity added successfully!' : 'Liquidity removed!');
    setIsSubmitting(false);
    setAgtAmt(''); setXlmAmt(''); setLpAmt('');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const statStyle = {
    display: 'flex', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)',
  };

  return (
    <main style={{ minHeight: '100vh', padding: '40px 16px 100px', maxWidth: 560, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Liquidity Pool</h1>
        <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>
          Provide AGT + XLM and earn {apy}% APY
        </p>

        {/* Pool Stats */}
        <div className="glass-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Droplets size={18} style={{ color: 'var(--accent)' }} />
            <span style={{ fontWeight: 600 }}>Pool Stats</span>
          </div>
          <div style={statStyle}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>TVL</span>
            <span style={{ fontWeight: 600 }}>${parseFloat(tvl).toLocaleString()}</span>
          </div>
          <div style={statStyle}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>AGT Reserve</span>
            <span style={{ fontWeight: 600 }}>{parseFloat(agtReserve).toLocaleString()} AGT</span>
          </div>
          <div style={{ ...statStyle, borderBottom: 'none' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>XLM Reserve</span>
            <span style={{ fontWeight: 600 }}>{parseFloat(xlmReserve).toLocaleString()} XLM</span>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['add', 'remove'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: 15, minHeight: 44,
                background: tab === t ? 'var(--accent)' : 'var(--card-bg)',
                color: 'white',
                boxShadow: tab === t ? '0 0 20px var(--accent-glow)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {t === 'add' ? <PlusCircle size={16} style={{ display: 'inline', marginRight: 6 }} /> : <MinusCircle size={16} style={{ display: 'inline', marginRight: 6 }} />}
              {t === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}>
            {tab === 'add' ? (
              <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>AGT Amount</label>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                      Bal: {parseFloat(agtBalance).toFixed(4)}
                    </span>
                  </div>
                  <input
                    type="number" placeholder="0.00" value={agtAmt}
                    onChange={(e) => handleAgtChange(e.target.value)}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--card-border)', borderRadius: 10,
                      padding: '12px 16px', fontSize: 20, color: 'white', outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>XLM Amount</label>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
                      Bal: {parseFloat(xlmBalance).toFixed(4)}
                    </span>
                  </div>
                  <input
                    type="number" placeholder="0.00" value={xlmAmt}
                    onChange={(e) => { setXlmAmt(e.target.value); if (e.target.value) setAgtAmt((parseFloat(e.target.value) / ratio).toFixed(6)); }}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--card-border)', borderRadius: 10,
                      padding: '12px 16px', fontSize: 20, color: 'white', outline: 'none',
                    }}
                  />
                </div>
                {agtAmt && (
                  <div style={{ background: 'rgba(139,92,246,0.08)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                    Ratio: 1 AGT = {ratio.toFixed(4)} XLM
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card">
                <label style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: 8 }}>LP Token Amount</label>
                <input
                  type="number" placeholder="0.00" value={lpAmt}
                  onChange={(e) => setLpAmt(e.target.value)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--card-border)', borderRadius: 10,
                    padding: '12px 16px', fontSize: 20, color: 'white', outline: 'none',
                  }}
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          className="btn-primary"
          onClick={submit}
          disabled={isSubmitting}
          style={{ width: '100%', marginTop: 16, fontSize: 16, minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          {isSubmitting ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</> : isConnected ? (tab === 'add' ? 'Add Liquidity' : 'Remove Liquidity') : 'Connect Wallet'}
        </button>

        {successMsg && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', textAlign: 'center', color: 'var(--success)' }}
          >
            ✓ {successMsg}
          </motion.div>
        )}
      </motion.div>
      <BottomNav />
    </main>
  );
}
