'use client';
import { motion } from 'framer-motion';
import { Activity, Wallet, ArrowUpRight, Loader2 } from 'lucide-react';
import { useFreighter } from '@/hooks/useFreighter';
import { useAGTBalance } from '@/hooks/useAGTBalance';
import { useContractEvents, ContractEvent } from '@/hooks/useContractEvents';
import { TrustlineCard } from '@/components/TrustlineCard';
import { BottomNav } from '@/components/BottomNav';

const EVENT_COLORS: Record<ContractEvent['type'], string> = {
  mint: '#10b981',
  burn: '#ef4444',
  swap: '#8b5cf6',
  liquidity: '#3b82f6',
  trustline: '#f59e0b',
  fee: '#ec4899',
};

const EventRow = ({ event }: { event: ContractEvent }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}
  >
    <div style={{
      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
      background: `${EVENT_COLORS[event.type]}20`,
      border: `1px solid ${EVENT_COLORS[event.type]}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: EVENT_COLORS[event.type], textTransform: 'uppercase' }}>
        {event.type.slice(0, 3)}
      </span>
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: 14 }}>{event.type}</span>
        <span style={{
          background: `${EVENT_COLORS[event.type]}20`, color: EVENT_COLORS[event.type],
          padding: '2px 8px', borderRadius: 20, fontSize: 11,
        }}>
          {parseFloat(event.amount || '0').toLocaleString(undefined, { maximumFractionDigits: 4 })} AGT
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.from ? `${event.from.slice(0, 8)}…${event.from.slice(-4)}` : '—'}
      </div>
    </div>
    <a
      href={`https://stellar.expert/explorer/testnet/tx/${event.txHash}`}
      target="_blank" rel="noopener noreferrer"
      style={{ color: 'rgba(255,255,255,0.3)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <ArrowUpRight size={14} />
    </a>
  </motion.div>
);

export default function DashboardPage() {
  const { isConnected, connect, publicKey, network } = useFreighter();
  const { agtBalance, xlmBalance, isLoading: balLoading } = useAGTBalance(publicKey);
  const { events, isLoading: eventsLoading } = useContractEvents();

  if (!isConnected) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 24 }}>
        <Wallet size={48} style={{ color: 'var(--accent)' }} />
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Connect Your Wallet</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 320 }}>
          Connect your Freighter wallet to view your dashboard.
        </p>
        <button className="btn-primary" onClick={connect} style={{ minHeight: 48, padding: '14px 32px', fontSize: 16 }}>
          Connect Freighter
        </button>
        <BottomNav />
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100vh', padding: '40px 16px 100px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }} />
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>
                {publicKey.slice(0, 8)}…{publicKey.slice(-8)} · {network}
              </span>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid-layout" style={{ padding: 0, marginBottom: 24 }}>
            <div className="glass-card">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>AGT Balance</p>
              {balLoading ? (
                <Loader2 size={20} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              ) : (
                <p style={{ fontSize: 32, fontWeight: 800 }}>
                  {parseFloat(agtBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  <span style={{ fontSize: 16, color: 'var(--accent)', marginLeft: 8 }}>AGT</span>
                </p>
              )}
            </div>
            <div className="glass-card">
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>XLM Balance</p>
              {balLoading ? (
                <Loader2 size={20} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              ) : (
                <p style={{ fontSize: 32, fontWeight: 800 }}>
                  {parseFloat(xlmBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  <span style={{ fontSize: 16, color: '#94a3b8', marginLeft: 8 }}>XLM</span>
                </p>
              )}
            </div>
            <div className="glass-card" style={{ gridColumn: 'span 1' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 8 }}>Network</p>
              <p style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{network}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>Stellar Testnet</p>
            </div>
          </div>

          {/* Trustline Card */}
          <div style={{ marginBottom: 24 }}>
            <TrustlineCard publicKey={publicKey} />
          </div>

          {/* Live Events Feed */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid var(--card-border)' }}>
              <Activity size={16} style={{ color: 'var(--accent)' }} />
              <span style={{ fontWeight: 600 }}>Live Transaction Feed</span>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', marginLeft: 'auto', animation: 'pulse 2s infinite' }} />
            </div>
            {eventsLoading ? (
              <div style={{ padding: 32, display: 'flex', justifyContent: 'center' }}>
                <Loader2 size={24} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
              </div>
            ) : events.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                No recent events
              </div>
            ) : (
              events.slice(0, 15).map((e) => <EventRow key={e.id} event={e} />)
            )}
          </div>
        </motion.div>
      </div>
      <BottomNav />
    </main>
  );
}
