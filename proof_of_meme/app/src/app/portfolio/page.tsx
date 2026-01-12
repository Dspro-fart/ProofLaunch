'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import { Coins, TrendingUp, Clock, Gift, AlertCircle, Loader2, ExternalLink, RefreshCw } from 'lucide-react';

interface BackingWithMeme {
  id: string;
  meme_id: string;
  amount_sol: number;
  status: 'pending' | 'confirmed' | 'refunded' | 'distributed';
  deposit_tx?: string;
  refund_tx?: string;
  created_at: string;
  memes: {
    id: string;
    name: string;
    symbol: string;
    image_url: string;
    status: string;
    backing_goal_sol: number;
    current_backing_sol: number;
    backing_deadline: string;
    mint_address?: string;
    pump_fun_url?: string;
    trust_score?: number;
  };
}

function getTimeRemaining(deadline: string): string {
  if (!deadline) return '--';

  const now = new Date();
  const end = new Date(deadline);

  // Check for invalid date
  if (isNaN(end.getTime())) return '--';

  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getStatusBadge(status: string) {
  const configs: Record<string, { label: string; class: string }> = {
    backing: { label: 'Proving', class: 'bg-blue-500/20 text-blue-400' },
    funded: { label: 'Funded', class: 'bg-green-500/20 text-green-400' },
    launching: { label: 'Launching', class: 'bg-yellow-500/20 text-yellow-400' },
    live: { label: 'Live', class: 'bg-green-500/20 text-green-400' },
    failed: { label: 'Failed', class: 'bg-red-500/20 text-red-400' },
  };
  return configs[status] || { label: status, class: 'bg-gray-500/20 text-gray-400' };
}

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet();
  const [backings, setBackings] = useState<BackingWithMeme[]>([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState<string | null>(null);

  const fetchBackings = useCallback(async () => {
    if (!publicKey) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/backings?backer=${publicKey.toBase58()}`);
      if (response.ok) {
        const data = await response.json();
        setBackings(data.backings || []);
      }
    } catch (error) {
      console.error('Failed to fetch backings:', error);
    } finally {
      setLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBackings();
    }
  }, [connected, publicKey, fetchBackings]);

  const handleRequestRefund = async (backing: BackingWithMeme) => {
    if (!publicKey) return;

    setRequesting(backing.id);
    try {
      const response = await fetch('/api/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meme_id: backing.meme_id,
          backer_wallet: publicKey.toBase58(),
        }),
      });

      if (response.ok) {
        // Refresh backings
        await fetchBackings();
      } else {
        const data = await response.json();
        alert(`Refund failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Refund request failed:', error);
      alert('Refund request failed');
    } finally {
      setRequesting(null);
    }
  };

  // Calculate stats
  const totalBacked = backings
    .filter(b => b.status === 'confirmed' || b.status === 'distributed')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  const activeBackings = backings.filter(
    b => b.status === 'confirmed' && b.memes.status === 'backing'
  ).length;

  const launchedBackings = backings.filter(
    b => b.memes.status === 'live'
  ).length;

  const refundedAmount = backings
    .filter(b => b.status === 'refunded')
    .reduce((sum, b) => sum + b.amount_sol, 0);

  if (!connected) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--warning)] mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-[var(--muted)]">
            Connect your wallet to view your portfolio and backings
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Your Portfolio</span>
          </h1>
          <p className="text-[var(--muted)]">
            Manage your backings and track your memes
          </p>
        </div>
        <button
          onClick={fetchBackings}
          className="p-2 rounded-lg bg-[var(--card)] hover:bg-[var(--border)] transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <Coins className="w-6 h-6 mx-auto mb-2 text-[var(--accent)]" />
          <div className="text-2xl font-bold">{totalBacked.toFixed(2)} SOL</div>
          <div className="text-sm text-[var(--muted)]">Total Backed</div>
        </div>
        <div className="card p-4 text-center">
          <Clock className="w-6 h-6 mx-auto mb-2 text-blue-400" />
          <div className="text-2xl font-bold">{activeBackings}</div>
          <div className="text-sm text-[var(--muted)]">Active Backings</div>
        </div>
        <div className="card p-4 text-center">
          <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-400" />
          <div className="text-2xl font-bold">{launchedBackings}</div>
          <div className="text-sm text-[var(--muted)]">Launched</div>
        </div>
        <div className="card p-4 text-center">
          <Gift className="w-6 h-6 mx-auto mb-2 text-yellow-400" />
          <div className="text-2xl font-bold">{refundedAmount.toFixed(2)} SOL</div>
          <div className="text-sm text-[var(--muted)]">Refunded</div>
        </div>
      </div>

      {/* Backings List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Backings</h2>

        {backings.length === 0 ? (
          <div className="card p-8 text-center">
            <Coins className="w-12 h-12 mx-auto text-[var(--muted)] mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No backings yet</h3>
            <p className="text-[var(--muted)] mb-4">
              Start backing memes in the Proving Grounds
            </p>
            <Link href="/" className="btn-primary inline-block">
              Browse Memes
            </Link>
          </div>
        ) : (
          backings.map((backing) => {
            const meme = backing.memes;
            const statusBadge = getStatusBadge(meme.status);
            const isProving = meme.status === 'backing';
            const isFailed = meme.status === 'failed';
            const isLive = meme.status === 'live';
            const isPastDeadline = new Date(meme.backing_deadline) < new Date();
            const canRefund = backing.status === 'confirmed' && isPastDeadline && !isLive;

            return (
              <div key={backing.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/meme/${meme.id}`}
                    className="flex items-center gap-4 hover:opacity-80 transition-opacity"
                  >
                    {meme.image_url ? (
                      <img
                        src={meme.image_url}
                        alt={meme.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-xl font-bold">
                        {meme.symbol.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{meme.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusBadge.class}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <span className="text-sm text-[var(--muted)]">${meme.symbol}</span>
                    </div>
                  </Link>

                  <div className="flex items-center gap-6">
                    {/* Amount backed */}
                    <div className="text-right">
                      <div className="text-sm text-[var(--muted)]">Backed</div>
                      <div className="font-semibold">{backing.amount_sol.toFixed(2)} SOL</div>
                    </div>

                    {/* Status-specific info */}
                    {isProving && (
                      <div className="text-right">
                        <div className="text-sm text-[var(--muted)]">Time Left</div>
                        <div className="font-semibold text-[var(--warning)]">
                          {getTimeRemaining(meme.backing_deadline)}
                        </div>
                      </div>
                    )}

                    {isLive && meme.pump_fun_url && (
                      <a
                        href={meme.pump_fun_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary flex items-center gap-2 py-2 px-4"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Trade
                      </a>
                    )}

                    {backing.status === 'refunded' && (
                      <div className="text-right">
                        <div className="text-sm text-[var(--muted)]">Status</div>
                        <div className="font-semibold text-green-400">Refunded</div>
                      </div>
                    )}

                    {canRefund && backing.status === 'confirmed' && (
                      <button
                        onClick={() => handleRequestRefund(backing)}
                        disabled={requesting === backing.id}
                        className="bg-[var(--warning)] hover:bg-[var(--warning)]/80 text-black font-semibold py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50"
                      >
                        {requesting === backing.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Request Refund
                      </button>
                    )}
                  </div>
                </div>

                {/* Progress bar for proving memes */}
                {isProving && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-[var(--muted)]">Progress</span>
                      <span>
                        {(Number(meme.current_backing_sol) || 0).toFixed(2)} / {Number(meme.backing_goal_sol) || 0} SOL
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent)] rounded-full transition-all"
                        style={{
                          width: `${Number(meme.backing_goal_sol) > 0
                            ? Math.min((Number(meme.current_backing_sol) / Number(meme.backing_goal_sol)) * 100, 100)
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Fee qualification note */}
                {backing.amount_sol >= 0.5 && (isProving || isLive) && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-center gap-2 text-sm text-[var(--success)]">
                    <Gift className="w-4 h-4" />
                    Qualifies for genesis fee share
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
