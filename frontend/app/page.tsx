'use client';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useFreighter } from '@/hooks/useFreighter';
import { StatsBar } from '@/components/StatsBar';
import { BottomNav } from '@/components/BottomNav';
import { zeroG, floatUp, stagger } from '@/lib/animations';

const FEATURES = [
  { title: 'Swap Tokens', desc: 'Instantly swap AGT ↔ XLM using the Soroban liquidity pool.', href: '/swap', cta: 'Start Swapping' },
  { title: 'Provide Liquidity', desc: 'Add AGT + XLM to the pool and earn yield on your position.', href: '/pool', cta: 'Add Liquidity' },
  { title: 'Your Dashboard', desc: 'Monitor your AGT balance, trustline status, and live transactions.', href: '/dashboard', cta: 'View Dashboard' },
];

export default function HomePage() {
  const { isConnected, connect, publicKey, network } = useFreighter();

  return (
    <main style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* Hero */}
      <section style={{
        position: 'relative', overflow: 'hidden',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(139,92,246,0.25) 0%, transparent 70%)',
        padding: '72px 24px 56px', textAlign: 'center',
      }}>
        {/* Floating zero-G logo mark */}
        <motion.div
          {...zeroG}
          style={{
            width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
            background: 'linear-gradient(135deg, var(--accent), #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 26, boxShadow: '0 0 40px var(--accent-glow)',
          }}
        >
          AG
        </motion.div>

        <motion.div {...floatUp}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
            padding: '5px 14px', borderRadius: 32, marginBottom: 20, fontSize: 12, fontWeight: 600,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
            Live on Stellar {network}
          </div>

          <h1 style={{
            fontSize: 'clamp(32px, 6.5vw, 68px)', fontWeight: 900, lineHeight: 1.1,
            background: 'linear-gradient(135deg, #fff 40%, var(--accent))',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 18,
          }}>
            Orbit Money
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 2.2vw, 18px)', color: 'rgba(255,255,255,0.55)',
            maxWidth: 520, margin: '0 auto 36px',
          }}>
            Orbital DeFi on Stellar Testnet. Swap AGT, provide liquidity, and earn yield — fully on-chain via Soroban.
          </p>

          {isConnected ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 12, padding: '9px 18px', fontFamily: 'monospace', fontSize: 13, color: 'var(--success)',
              }}>
                {publicKey.slice(0, 6)}…{publicKey.slice(-6)}
              </div>
              <Link href="/dashboard">
                <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 44 }}>
                  Open Dashboard <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              className="btn-primary"
              onClick={connect}
              style={{ fontSize: 16, padding: '14px 32px', minHeight: 48 }}
            >
              Connect Freighter Wallet
            </motion.button>
          )}
        </motion.div>

        {/* Decorative floating orb */}
        <motion.div
          animate={{ y: [0, -20, 0] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '8%', right: '4%', width: 220, height: 220,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.25), transparent)',
            filter: 'blur(40px)', pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={{ y: [0, 14, 0] }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.5 }}
          style={{
            position: 'absolute', bottom: '5%', left: '6%', width: 160, height: 160,
            borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.2), transparent)',
            filter: 'blur(30px)', pointerEvents: 'none',
          }}
        />
      </section>

      {/* Live Stats */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 0' }}>
        <StatsBar />
      </div>

      {/* Feature cards — staggered */}
      <div className="grid-layout">
        {FEATURES.map(({ title, desc, href, cta }, i) => (
          <motion.div key={href} {...stagger(i)} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>{title}</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, flex: 1 }}>{desc}</p>
            <Link href={href}>
              <button className="btn-primary" style={{ width: '100%', minHeight: 44 }}>{cta}</button>
            </Link>
          </motion.div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
