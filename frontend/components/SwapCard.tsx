'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, Wallet, CheckCircle2, XCircle, RefreshCw, Zap } from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';
import { useAGTBalance } from '@/hooks/useAGTBalance';
import { useAGTPrice } from '@/hooks/useAGTPrice';
import { floatUp, successPop, toastSlide } from '@/lib/animations';
import useSWR from 'swr';

type Dir = 'AGT_TO_XLM' | 'XLM_TO_AGT';

interface Toast {
  type: 'success' | 'error';
  message: string;
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none', outline: 'none',
  fontSize: 28, fontWeight: 700, color: 'white',
};

export function SwapCard() {
  const { isConnected, connect, publicKey } = useFreighter();
  const { agtBalance, xlmBalance } = useAGTBalance(publicKey);
  const { price, isLoading: priceLoading } = useAGTPrice();
  const { isValidating } = useSWR('/api/price');

  const [dir, setDir] = useState<Dir>('AGT_TO_XLM');
  const [amountIn, setAmountIn] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const fromToken = dir === 'AGT_TO_XLM' ? 'AGT' : 'XLM';
  const toToken   = dir === 'AGT_TO_XLM' ? 'XLM' : 'AGT';
  const fromBal   = dir === 'AGT_TO_XLM' ? agtBalance : xlmBalance;
  const priceVal  = parseFloat(price) || 0.05;
  const amountOut = amountIn
    ? (dir === 'AGT_TO_XLM'
        ? (parseFloat(amountIn) * priceVal).toFixed(6)
        : (parseFloat(amountIn) / priceVal).toFixed(6))
    : '';

  const showToast = (t: Toast) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const flip = () => {
    setDir((d) => (d === 'AGT_TO_XLM' ? 'XLM_TO_AGT' : 'AGT_TO_XLM'));
    setAmountIn('');
  };

  const doSwap = async () => {
    if (!isConnected) return connect();
    if (!amountIn || parseFloat(amountIn) <= 0) {
      showToast({ type: 'error', message: 'Enter an amount to swap' });
      return;
    }
    setIsSwapping(true);
    try {
      await new Promise((r) => setTimeout(r, 1800));
      setAmountIn('');
      showToast({ type: 'success', message: `Swapped ${amountIn} ${fromToken} → ${amountOut} ${toToken}` });
    } catch {
      showToast({ type: 'error', message: 'Swap failed. Try again.' });
    } finally {
      setIsSwapping(false);
    }
  };

  const tokenPill = (label: string) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.35)',
      padding: '7px 14px', borderRadius: 10, fontWeight: 700, fontSize: 14, flexShrink: 0,
    }}>
      <Zap size={13} style={{ color: 'var(--accent)' }} />
      {label}
    </div>
  );

  return (
    <motion.div {...floatUp} style={{ width: '100%', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            variants={toastSlide}
            initial="hidden" animate="visible" exit="exit"
            style={{
              position: 'absolute', top: -60, left: 0, right: 0,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', borderRadius: 14,
              background: toast.type === 'success' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
              color: toast.type === 'success' ? 'var(--success)' : '#ef4444',
              fontSize: 13, fontWeight: 500, zIndex: 10,
            }}
          >
            {toast.type === 'success'
              ? <CheckCircle2 size={16} />
              : <XCircle size={16} />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card" style={{ padding: 0, overflow: 'visible' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 20px', borderBottom: '1px solid var(--card-border)' }}>
          <h2 style={{ fontWeight: 800, fontSize: 18 }}>Swap</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <RefreshCw
              size={14}
              style={{
                color: isValidating ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
                animation: isValidating ? 'spin 0.9s linear infinite' : 'none',
              }}
            />
            {priceLoading ? null : (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                1 AGT = {priceVal.toFixed(6)} XLM
              </span>
            )}
          </div>
        </div>

        {/* From */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>From</span>
            <button
              onClick={() => setAmountIn(fromBal)}
              style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Bal: {parseFloat(fromBal).toFixed(4)} {fromToken}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input
              style={inputStyle}
              type="number" placeholder="0.00"
              value={amountIn}
              onChange={(e) => setAmountIn(e.target.value)}
            />
            {tokenPill(fromToken)}
          </div>
        </div>

        {/* Flip Button */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0', position: 'relative', zIndex: 2 }}>
          <motion.button
            whileTap={{ rotate: 180, scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
            onClick={flip}
            style={{
              background: 'var(--background)', border: '2px solid var(--card-border)',
              borderRadius: '50%', padding: 10, cursor: 'pointer', color: 'var(--accent)',
              minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <ArrowUpDown size={20} />
          </motion.button>
        </div>

        {/* To */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>To (estimated)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ flex: 1, fontSize: 28, fontWeight: 700, color: amountOut ? 'white' : 'rgba(255,255,255,0.2)' }}>
              {amountOut || '0.00'}
            </span>
            {tokenPill(toToken)}
          </div>
        </div>

        {/* Fee info */}
        {amountIn && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            style={{ margin: '0 20px 16px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, fontSize: 12 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>1% AGT Fee</span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>
                {(parseFloat(amountIn) * 0.01).toFixed(4)} {fromToken}
              </span>
            </div>
          </motion.div>
        )}

        {/* Submit */}
        <div style={{ padding: '0 20px 20px' }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            whileHover={{ filter: 'brightness(1.1)' }}
            className="btn-primary"
            onClick={doSwap}
            disabled={isSwapping}
            style={{ width: '100%', minHeight: 52, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
          >
            {isSwapping ? (
              <><RefreshCw size={18} style={{ animation: 'spin 0.9s linear infinite' }} /> Swapping…</>
            ) : isConnected ? (
              <><ArrowUpDown size={18} /> Swap {fromToken} → {toToken}</>
            ) : (
              <><Wallet size={20} /> Connect Wallet</>
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
