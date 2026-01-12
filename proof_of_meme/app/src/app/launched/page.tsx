'use client';

import { useState, useEffect, useCallback } from 'react';
import { MemeCard } from '@/components/MemeCard';
import { BarChart3, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import type { Meme } from '@/types/database';

export default function LaunchedPage() {
  const [memes, setMemes] = useState<Meme[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    launchedCount: 0,
    totalBacked: 0,
  });

  const fetchMemes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/memes?status=live');
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setMemes(data.memes || []);

      const totalBacked = (data.memes || []).reduce(
        (sum: number, m: Meme) => sum + Number(m.current_backing_sol || 0),
        0
      );

      setStats({
        launchedCount: (data.memes || []).length,
        totalBacked,
      });
    } catch (error) {
      console.error('Failed to fetch memes:', error);
      setMemes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMemes();
  }, [fetchMemes]);

  const statsDisplay = [
    { label: 'Launched Tokens', value: stats.launchedCount.toString(), icon: BarChart3, color: 'text-[var(--success)]' },
    { label: 'Total Raised', value: `${stats.totalBacked.toFixed(1)} SOL`, icon: TrendingUp, color: 'text-[var(--accent)]' },
    { label: 'Trading on Pump.fun', value: stats.launchedCount.toString(), icon: DollarSign, color: 'text-[var(--warning)]' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">
          <span className="gradient-text">Live Tokens</span>
        </h1>
        <p className="text-[var(--muted)] max-w-xl mx-auto">
          Tokens that made it through the Proving Grounds. Now live on Pump.fun
          with full visibility on Axiom, Photon, and Birdeye.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {statsDisplay.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="card p-4 text-center">
              <Icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-sm text-[var(--muted)]">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      )}

      {/* Token Grid */}
      {!loading && memes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {memes.map((meme) => (
            <MemeCard key={meme.id} meme={meme as any} />
          ))}
        </div>
      )}

      {!loading && memes.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 mx-auto text-[var(--muted)] mb-4" />
          <h3 className="text-lg font-medium mb-2">No launched tokens yet</h3>
          <p className="text-[var(--muted)]">Check back soon!</p>
        </div>
      )}
    </div>
  );
}
