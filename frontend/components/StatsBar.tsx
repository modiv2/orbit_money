'use client';
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Droplets, Zap, RefreshCw } from 'lucide-react';
import { useAGTPrice } from '@/hooks/useAGTPrice';
import { usePoolStats } from '@/hooks/usePoolStats';
import { stagger } from '@/lib/animations';
import { SkeletonCard } from '@/components/Skeleton';
import useSWR from 'swr';

interface StatItem {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  color: string;
}

const StatMetric = memo(function StatMetric({ item, index }: { item: StatItem; index: number }) {
  const { icon: Icon, label, value, sub, color } = item;
  return (
    <motion.div
      {...stagger(index)}
      className="glass-card"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{value}</p>
        {sub && (
          <p style={{ fontSize: 11, marginTop: 4, color: sub.startsWith('+') ? 'var(--success)' : 'rgba(255,255,255,0.4)' }}>
            {sub}
          </p>
        )}
      </div>
    </motion.div>
  );
});

export const StatsBar = memo(function StatsBar() {
  const { price, change24h, isLoading: priceLoading } = useAGTPrice();
  const { tvl, volume24h, apy, isLoading: poolLoading } = usePoolStats();
  const { isValidating: priceValidating } = useSWR('/api/price');
  const { isValidating: poolValidating }  = useSWR('/api/pool');
  const isValidating = priceValidating || poolValidating;
  const isLoading    = priceLoading || poolLoading;

  const stats: StatItem[] = [
    {
      label: 'AGT Price',
      value: `$${parseFloat(price).toFixed(6)}`,
      sub: `${parseFloat(change24h) >= 0 ? '+' : ''}${change24h}% 24h`,
      icon: TrendingUp,
      color: '#8b5cf6',
    },
    {
      label: 'Total Value Locked',
      value: `$${parseFloat(tvl).toLocaleString()}`,
      sub: `APY ${apy}%`,
      icon: Droplets,
      color: '#3b82f6',
    },
    {
      label: '24h Volume',
      value: `$${parseFloat(volume24h).toLocaleString()}`,
      sub: '',
      icon: Zap,
      color: '#10b981',
    },
  ];

  return (
    <section style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <span style={{
          fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500,
          letterSpacing: '0.06em', textTransform: 'uppercase',
        }}>
          Live Stats
        </span>
        <RefreshCw
          size={11}
          style={{
            color: isValidating ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
            animation: isValidating ? 'spin 0.9s linear infinite' : 'none',
            transition: 'color 0.2s',
          }}
        />
      </div>

      <div className="grid-layout" style={{ padding: 0 }}>
        {isLoading
          ? [0, 1, 2].map((i) => <SkeletonCard key={i} rows={2} />)
          : stats.map((s, i) => <StatMetric key={s.label} item={s} index={i} />)
        }
      </div>
    </section>
  );
});
