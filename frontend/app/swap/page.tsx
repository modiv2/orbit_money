'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeftRight, Settings, Loader2, ChevronDown } from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';
import { useAGTBalance } from '@/hooks/useAGTBalance';
import { useAGTPrice } from '@/hooks/useAGTPrice';
import { BottomNav } from '@/components/BottomNav';

type TokenDir = 'AGT_TO_XLM' | 'XLM_TO_AGT';

export default function SwapPage() {
  const { isConnected, connect, publicKey } = useFreighter();
  const { agtBalance, xlmBalance } = useAGTBalance(publicKey);
  const { price } = useAGTPrice();
  const [dir, setDir] = useState<TokenDir>('AGT_TO_XLM');
  const [amountIn, setAmountIn] = useState('');
  const [slippage] = useState('0.5');
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState('');

  const flip = () => setDir((d) => (d === 'AGT_TO_XLM' ? 'XLM_TO_AGT' : 'AGT_TO_XLM'));
  const fromToken = dir === 'AGT_TO_XLM' ? 'AGT' : 'XLM';
  const toToken = dir === 'AGT_TO_XLM' ? 'XLM' : 'AGT';
  const fromBalance = dir === 'AGT_TO_XLM' ? agtBalance : xlmBalance;
  const priceVal = parseFloat(price) || 0.05;
  const amountOut = amountIn
    ? (dir === 'AGT_TO_XLM'
        ? (parseFloat(amountIn) * priceVal).toFixed(6)
        : (parseFloat(amountIn) / priceVal).toFixed(6))
    : '';

  const doSwap = async () => {
    if (!isConnected) return connect();
    if (!amountIn || parseFloat(amountIn) <= 0) return;
    setIsSwapping(true);
    // In production: build Soroban tx, sign with Freighter, submit
    await new Promise((r) => setTimeout(r, 1800));
    setTxHash('demo_' + Date.now());
    setIsSwapping(false);
    setAmountIn('');
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px 100px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800 }}>Swap</h1>
            <button style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 10, padding: 10, cursor: 'pointer', color: 'white', minHeight: 44, minWidth: 44 }}>
              <Settings size={18} />
            </button>
          </div>

          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* From */}
            <div style={{ padding: 20, borderBottom: '1px solid var(--card-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>From</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
                  Bal: {parseFloat(fromBalance).toFixed(4)} {fromToken}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amountIn}
                  onChange={(e) => setAmountIn(e.target.value)}
                  style={{
                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                    fontSize: 32, fontWeight: 700, color: 'white', width: '100%',
                  }}
                />
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                  padding: '8px 14px', borderRadius: 10, whiteSpace: 'nowrap',
                }}>
                  <span style={{ fontWeight: 600 }}>{fromToken}</span>
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Flip */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
              <motion.button
                whileTap={{ rotate: 180 }}
                onClick={flip}
                style={{
                  background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)',
                  borderRadius: '50%', padding: 10, cursor: 'pointer', color: 'white',
                  minHeight: 44, minWidth: 44,
                }}
              >
                <ArrowLeftRight size={18} />
              </motion.button>
            </div>

            {/* To */}
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>To (estimated)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontSize: 32, fontWeight: 700, color: amountOut ? 'white' : 'rgba(255,255,255,0.3)' }}>
                  {amountOut || '0.00'}
                </span>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                  padding: '8px 14px', borderRadius: 10,
                }}>
                  <span style={{ fontWeight: 600 }}>{toToken}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Info Row */}
          {amountIn && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginTop: 12, padding: '12px 16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: 12, fontSize: 13 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Rate</span>
                <span>1 {fromToken} = {dir === 'AGT_TO_XLM' ? priceVal.toFixed(6) : (1 / priceVal).toFixed(6)} {toToken}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>Slippage</span>
                <span style={{ color: 'var(--warning)' }}>{slippage}%</span>
              </div>
            </motion.div>
          )}

          <button
            className="btn-primary"
            onClick={doSwap}
            disabled={isSwapping}
            style={{ width: '100%', marginTop: 16, fontSize: 16, minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            {isSwapping ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Swapping…</> : isConnected ? 'Swap' : 'Connect Wallet'}
          </button>

          <AnimatePresence>
            {txHash && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginTop: 12, padding: 12, borderRadius: 12,
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                  fontSize: 13, color: 'var(--success)', textAlign: 'center',
                }}
              >
                ✓ Swap complete — tx: {txHash.slice(0, 16)}…
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
      <BottomNav />
    </main>
  );
}
