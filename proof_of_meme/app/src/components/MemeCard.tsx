'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { Users, Target, Clock, TrendingUp, Flame, ExternalLink, Shield, Copy, Check } from 'lucide-react';
import type { Meme } from '@/types/database';

// Get trust score color based on value
function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

interface MemeCardProps {
  meme: Meme & {
    backer_count?: number;
    progress_percent?: number;
  };
}

// Calculate time remaining from deadline
function getTimeRemaining(deadline: string): string {
  const now = new Date();
  const end = new Date(deadline);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'Ended';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// Map our status to display config
function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; class: string }> = {
    pending: { label: 'Pending', class: 'badge-pending' },
    backing: { label: 'Proving', class: 'badge-proving' },
    funded: { label: 'Funded', class: 'badge-funded' },
    launching: { label: 'Launching...', class: 'badge-launching' },
    live: { label: 'Live', class: 'badge-launched' },
    failed: { label: 'Failed', class: 'badge-failed' },
  };
  return configs[status] || { label: status, class: 'badge-pending' };
}

export const MemeCard: FC<MemeCardProps> = ({ meme }) => {
  const [caCopied, setCaCopied] = useState(false);

  const {
    id,
    name,
    symbol,
    description,
    status,
    backing_goal_sol,
    current_backing_sol,
    backing_deadline,
    creator_wallet,
    image_url,
    pump_fun_url,
    mint_address,
    backer_count = 0,
    trust_score = 75,
  } = meme;

  const handleCopyCA = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mint_address) {
      navigator.clipboard.writeText(mint_address);
      setCaCopied(true);
      setTimeout(() => setCaCopied(false), 2000);
    }
  };

  const progress = (Number(current_backing_sol) / Number(backing_goal_sol)) * 100;
  const timeRemaining = getTimeRemaining(backing_deadline);
  const { label: statusLabel, class: statusClass } = getStatusConfig(status);

  return (
    <Link href={`/meme/${id}`}>
      <div className="card p-5 cursor-pointer glow-hover group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {image_url ? (
              <img
                src={image_url}
                alt={name}
                className="w-12 h-12 rounded-xl object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-xl font-bold">
                {symbol.charAt(0)}
              </div>
            )}
            <div>
              <h3 className="font-bold text-lg group-hover:text-[var(--accent)] transition-colors">
                {name}
              </h3>
              <span className="text-sm text-[var(--muted)]">${symbol}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
              {statusLabel}
            </span>
            <div className={`flex items-center gap-1 text-xs ${getTrustScoreColor(trust_score)}`}>
              <Shield className="w-3 h-3" />
              <span>{trust_score}</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
          {description || 'No description provided'}
        </p>

        {/* Progress bar (for backing phase) */}
        {status === 'backing' && (
          <div className="space-y-3 mb-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[var(--muted)] flex items-center gap-1">
                  <Target className="w-3 h-3" /> SOL Goal
                </span>
                <span className="font-medium">
                  {Number(current_backing_sol).toFixed(2)} / {Number(backing_goal_sol)} SOL
                </span>
              </div>
              <div className="progress-bar h-2">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-1 text-sm text-[var(--muted)]">
              <Users className="w-4 h-4" />
              <span>{backer_count} backers</span>
            </div>
          </div>
        )}

        {/* Stats for live tokens */}
        {status === 'live' && (
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-[var(--success)]" />
                <span className="text-[var(--success)]">Live on Pump.fun</span>
              </div>
              {pump_fun_url && (
                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(pump_fun_url, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center gap-1 text-sm text-[var(--accent)] hover:underline cursor-pointer"
                >
                  <ExternalLink className="w-3 h-3" />
                  Trade
                </span>
              )}
            </div>
            {/* Copyable CA */}
            {mint_address && (
              <button
                onClick={handleCopyCA}
                className="w-full flex items-center gap-2 px-3 py-2 bg-[var(--background)] hover:bg-[var(--border)] rounded-lg transition-colors group/ca"
              >
                <span className="text-xs text-[var(--muted)]">CA:</span>
                <code className="flex-1 text-xs font-mono truncate text-[var(--foreground)]">
                  {mint_address}
                </code>
                {caCopied ? (
                  <Check className="w-4 h-4 text-[var(--success)] flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-[var(--muted)] group-hover/ca:text-[var(--accent)] flex-shrink-0" />
                )}
              </button>
            )}
          </div>
        )}

        {/* Funded - ready to launch */}
        {status === 'funded' && (
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-[var(--warning)]" />
            <span className="text-sm text-[var(--warning)]">Ready to launch!</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
          {status === 'backing' && (
            <div className="flex items-center gap-1 text-sm text-[var(--warning)]">
              <Clock className="w-4 h-4" />
              <span>{timeRemaining}</span>
            </div>
          )}

          <span className="text-xs text-[var(--muted)] ml-auto">
            {creator_wallet.slice(0, 4)}...{creator_wallet.slice(-4)}
          </span>
        </div>
      </div>
    </Link>
  );
};
