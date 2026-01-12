'use client';

import { useState, useMemo } from 'react';
import { MemeCard } from '@/components/MemeCard';
import { Flame, TrendingUp, Users, Search, Loader2, Shield, ArrowUpDown, SlidersHorizontal } from 'lucide-react';
import { useRealtimeMemes } from '@/hooks/useRealtimeMemes';
import type { Meme } from '@/types/database';

type SortOption = 'newest' | 'trust_high' | 'trust_low' | 'progress' | 'ending_soon';

export default function Home() {
  const [filter, setFilter] = useState<'all' | 'backing' | 'live'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [minTrustScore, setMinTrustScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  // Use real-time memes hook
  const { memes, loading } = useRealtimeMemes({ status: filter });

  // Calculate stats from memes
  const stats = useMemo(() => {
    const backingMemes = memes.filter((m: Meme) => m.status === 'backing');
    const totalBacked = memes.reduce((sum: number, m: Meme) => sum + Number(m.current_backing_sol || 0), 0);
    const totalBackers = memes.reduce((sum: number, m: any) => sum + (m.backer_count || 0), 0);

    return {
      activeProving: backingMemes.length,
      totalBacked,
      totalBackers,
    };
  }, [memes]);

  // Filter and sort memes
  const filteredMemes = useMemo(() => {
    let result = memes.filter(meme =>
      (meme.name.toLowerCase().includes(search.toLowerCase()) ||
       meme.symbol.toLowerCase().includes(search.toLowerCase())) &&
      (meme.trust_score || 75) >= minTrustScore
    );

    // Sort based on selected option
    result.sort((a, b) => {
      switch (sortBy) {
        case 'trust_high':
          return (b.trust_score || 75) - (a.trust_score || 75);
        case 'trust_low':
          return (a.trust_score || 75) - (b.trust_score || 75);
        case 'progress':
          const progressA = Number(a.current_backing_sol) / Number(a.backing_goal_sol);
          const progressB = Number(b.current_backing_sol) / Number(b.backing_goal_sol);
          return progressB - progressA;
        case 'ending_soon':
          return new Date(a.backing_deadline).getTime() - new Date(b.backing_deadline).getTime();
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [memes, search, minTrustScore, sortBy]);

  const statsDisplay = [
    { label: 'Active in Proving', value: stats.activeProving.toString(), icon: Flame, color: 'text-[var(--accent)]' },
    { label: 'Total Backed', value: `${stats.totalBacked.toFixed(1)} SOL`, icon: TrendingUp, color: 'text-[var(--success)]' },
    { label: 'Genesis Backers', value: stats.totalBackers.toString(), icon: Users, color: 'text-[var(--warning)]' },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold">
          <span className="gradient-text">The Proving Grounds</span>
        </h1>
        <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
          Communities form BEFORE tokens launch. Back memes you believe in,
          get in early when they go live on Pump.fun.
        </p>
      </div>

      {/* Stats Bar */}
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

      {/* Search and Filter */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search memes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg bg-[var(--card)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2">
            {([
              { key: 'all', label: 'All' },
              { key: 'backing', label: 'Proving' },
              { key: 'live', label: 'Live' },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {f.label}
              </button>
            ))}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                showFilters || minTrustScore > 0
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--card)] text-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="card p-4 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            {/* Sort By */}
            <div className="flex items-center gap-3">
              <ArrowUpDown className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--muted)]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="newest">Newest</option>
                <option value="trust_high">Trust Score (High)</option>
                <option value="trust_low">Trust Score (Low)</option>
                <option value="progress">Most Progress</option>
                <option value="ending_soon">Ending Soon</option>
              </select>
            </div>

            {/* Trust Score Filter */}
            <div className="flex items-center gap-3 flex-1">
              <Shield className="w-4 h-4 text-[var(--muted)]" />
              <span className="text-sm text-[var(--muted)] whitespace-nowrap">Min Trust:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={minTrustScore}
                onChange={(e) => setMinTrustScore(Number(e.target.value))}
                className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <span className={`text-sm font-medium min-w-[3rem] ${
                minTrustScore >= 80 ? 'text-green-400' :
                minTrustScore >= 60 ? 'text-yellow-400' :
                minTrustScore >= 40 ? 'text-orange-400' : 'text-[var(--muted)]'
              }`}>
                {minTrustScore}+
              </span>
            </div>

            {/* Reset Filters */}
            {(minTrustScore > 0 || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setMinTrustScore(0);
                  setSortBy('newest');
                }}
                className="text-sm text-[var(--accent)] hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      )}

      {/* Meme Grid */}
      {!loading && filteredMemes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMemes.map((meme) => (
            <MemeCard key={meme.id} meme={meme as any} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredMemes.length === 0 && (
        <div className="text-center py-12">
          <Flame className="w-12 h-12 mx-auto text-[var(--muted)] mb-4" />
          <h3 className="text-lg font-medium mb-2">No memes found</h3>
          <p className="text-[var(--muted)]">
            {search ? 'Try a different search term' : 'Be the first to submit a meme!'}
          </p>
        </div>
      )}

      {/* How It Works Section */}
      <div className="mt-16 py-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { step: '1', title: 'Submit', desc: 'Creator submits a meme to the Proving Grounds' },
            { step: '2', title: 'Back', desc: 'Community backs with SOL to prove demand' },
            { step: '3', title: 'Launch', desc: 'Hit the goal = token launches on Pump.fun' },
            { step: '4', title: 'Trade', desc: 'Token goes live with instant visibility' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-lg font-bold mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-[var(--muted)]">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
