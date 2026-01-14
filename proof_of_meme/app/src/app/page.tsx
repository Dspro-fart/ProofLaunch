'use client';

import { useState, useMemo } from 'react';
import { MemeCard } from '@/components/MemeCard';
import { Flame, TrendingUp, Users, Search, Loader2, Shield, ArrowUpDown, SlidersHorizontal, ChevronLeft, ChevronRight, Copy, Check } from 'lucide-react';
import { useRealtimeMemes } from '@/hooks/useRealtimeMemes';
import type { Meme } from '@/types/database';

type SortOption = 'newest' | 'trust_high' | 'trust_low' | 'progress' | 'ending_soon';

const ITEMS_PER_PAGE = 20;

const PLATFORM_TOKEN_CA = '6EbtoNRhjrBemVjPo7QpjazdRrHiADkNDUkBbzCTpump';

export default function Home() {
  const [filter, setFilter] = useState<'all' | 'backing' | 'live'>('all');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [minTrustScore, setMinTrustScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [caCopied, setCaCopied] = useState(false);

  const handleCopyCA = () => {
    navigator.clipboard.writeText(PLATFORM_TOKEN_CA);
    setCaCopied(true);
    setTimeout(() => setCaCopied(false), 2000);
  };

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

  // Pagination
  const totalPages = Math.ceil(filteredMemes.length / ITEMS_PER_PAGE);
  const paginatedMemes = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredMemes.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredMemes, currentPage]);

  // Reset to page 1 when filters change
  const handleFilterChange = (newFilter: 'all' | 'backing' | 'live') => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleTrustScoreChange = (value: number) => {
    setMinTrustScore(value);
    setCurrentPage(1);
  };

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
        {/* Platform Token CA */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <span className="text-sm text-[var(--muted)]">CA:</span>
          <button
            onClick={handleCopyCA}
            className="flex items-center gap-2 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors group"
          >
            <code className="text-xs md:text-sm font-mono text-[var(--foreground)]">
              {PLATFORM_TOKEN_CA}
            </code>
            {caCopied ? (
              <Check className="w-4 h-4 text-[var(--success)]" />
            ) : (
              <Copy className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)]" />
            )}
          </button>
          <a
            href="https://x.com/ProofLaunch"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card)] border border-[var(--border)] rounded-lg hover:border-[var(--accent)] transition-colors group"
          >
            <svg className="w-4 h-4 text-[var(--muted)] group-hover:text-[var(--accent)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm text-[var(--muted)] group-hover:text-[var(--accent)]">Follow</span>
          </a>
        </div>
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
              placeholder="Search by name or symbol..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
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
                onClick={() => handleFilterChange(f.key)}
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
                onChange={(e) => handleSortChange(e.target.value as SortOption)}
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
                onChange={(e) => handleTrustScoreChange(Number(e.target.value))}
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
                  setCurrentPage(1);
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

      {/* Results Count */}
      {!loading && filteredMemes.length > 0 && (
        <div className="flex justify-between items-center text-sm text-[var(--muted)]">
          <span>
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredMemes.length)} of {filteredMemes.length} memes
          </span>
          {totalPages > 1 && (
            <span>Page {currentPage} of {totalPages}</span>
          )}
        </div>
      )}

      {/* Meme Grid */}
      {!loading && paginatedMemes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {paginatedMemes.map((meme) => (
            <MemeCard key={meme.id} meme={meme as any} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background)] transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page => {
                // Show first, last, current, and nearby pages
                if (page === 1 || page === totalPages) return true;
                if (Math.abs(page - currentPage) <= 2) return true;
                return false;
              })
              .map((page, index, array) => {
                // Add ellipsis if there's a gap
                const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                return (
                  <div key={page} className="flex items-center gap-1">
                    {showEllipsisBefore && (
                      <span className="px-2 text-[var(--muted)]">...</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`min-w-[40px] h-10 rounded-lg font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-[var(--accent)] text-white'
                          : 'bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)]'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                );
              })}
          </div>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg bg-[var(--card)] border border-[var(--border)] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--background)] transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
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
