'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Link2, RefreshCw, Coins } from 'lucide-react';
import { useTrustline } from '@/hooks/useTrustline';
import { successPop } from '@/lib/animations';
import { useState } from 'react';
import useSWR from 'swr';

export function TrustlineCard({ publicKey }: { publicKey: string }) {
  const { hasTrustline, agtBalance, agtLimit, isLoading, isAdding, addTrustline } =
    useTrustline(publicKey);
  const { isValidating } = useSWR(publicKey ? `/api/balance/${publicKey}` : null);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = async () => {
    await addTrustline();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 5000);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <RefreshCw size={16} style={{ color: 'var(--accent)', animation: 'spin 0.9s linear infinite' }} />
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Checking trustline…</span>
      </div>
    );
  }

  // No trustline state
  if (!hasTrustline) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.05)' }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <AlertCircle size={16} style={{ color: 'var(--warning)', marginTop: 2, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 4, fontSize: 14 }}>
              No AGT Trustline
            </p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, marginBottom: 16 }}>
              Your wallet has no AGT trustline. Add it to receive AGT tokens.
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              className="btn-primary"
              onClick={handleAdd}
              disabled={isAdding}
              style={{
                minHeight: 44, display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', fontSize: 14,
                background: 'rgba(245,158,11,0.8)',
                boxShadow: '0 0 20px rgba(245,158,11,0.3)',
              }}
            >
              {isAdding
                ? <><RefreshCw size={14} style={{ animation: 'spin 0.9s linear infinite' }} /> Adding…</>
                : <><Link2 size={14} /> Add Trustline</>}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Active trustline state — with justAdded success animation
  return (
    <AnimatePresence mode="wait">
      {justAdded ? (
        <motion.div
          key="success"
          variants={successPop}
          initial="hidden" animate="visible" exit="exit"
          className="glass-card"
          style={{ borderColor: 'rgba(16,185,129,0.6)', background: 'rgba(16,185,129,0.08)', textAlign: 'center' }}
        >
          <CheckCircle2 size={36} style={{ color: 'var(--success)', margin: '0 auto 12px' }} />
          <p style={{ fontWeight: 700, color: 'var(--success)', fontSize: 16 }}>Trustline Added!</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
            You can now receive AGT tokens.
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="active"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card"
          style={{ borderColor: 'rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.05)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />
            <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: 14 }}>
              Trustline active
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 'auto' }}>
              Limit: {parseFloat(agtLimit).toLocaleString()} AGT
            </span>
            <RefreshCw
              size={12}
              style={{
                color: isValidating ? 'rgba(255,255,255,0.4)' : 'transparent',
                animation: isValidating ? 'spin 0.9s linear infinite' : 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Coins size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>AGT Balance</span>
            </div>
            <motion.span
              key={agtBalance}
              initial={{ opacity: 0.4, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 22, fontWeight: 800 }}
            >
              {parseFloat(agtBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
              <span style={{ fontSize: 13, color: 'var(--accent)', marginLeft: 6 }}>AGT</span>
            </motion.span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
