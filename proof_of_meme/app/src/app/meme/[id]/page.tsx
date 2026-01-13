'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  ArrowLeft,
  Users,
  Target,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import type { Meme } from '@/types/database';
import { MemeChat } from '@/components/MemeChat';
import { BackersList } from '@/components/BackersList';
import { TrustScoreDisplay } from '@/components/TrustScoreDisplay';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { calculateTrustScore } from '@/lib/trustScore';
import { useRealtimeMeme, useRealtimeBackings } from '@/hooks/useRealtimeMemes';

// Escrow wallet address - MAINNET
const ESCROW_WALLET = 'HfkGmHTpQigABpkSK3ECETTxdBgFyt2CgYVoCLDqDffv';

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

// Map status to display style
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

export default function MemeDetailPage() {
  const { id } = useParams();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [amount, setAmount] = useState('');
  const [tradeType, setTradeType] = useState<'back' | 'buy' | 'sell'>('back');
  const [copied, setCopied] = useState(false);
  const [backing, setBacking] = useState(false);
  const [backingStatus, setBackingStatus] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawStatus, setWithdrawStatus] = useState<string | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [showLaunchConfirm, setShowLaunchConfirm] = useState(false);
  const [pendingWithdrawWallet, setPendingWithdrawWallet] = useState<string | null>(null);
  const [pendingWithdrawAmount, setPendingWithdrawAmount] = useState<number>(0);

  // Use real-time hooks for meme and backings
  const { meme, loading, error, refetch: refetchMeme } = useRealtimeMeme(id as string);
  const { backings, refetch: refetchBackings } = useRealtimeBackings(id as string);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBack = async () => {
    if (!connected || !publicKey || !amount || !meme) return;

    const amountSol = parseFloat(amount);
    if (isNaN(amountSol) || amountSol <= 0) {
      setBackingStatus('Error: Invalid amount');
      return;
    }

    // Check max backing limit (10% of goal)
    const maxBackingPerWallet = Number(meme.backing_goal_sol) * 0.1;
    const myExistingBacking = backings.find(
      (b) => b.backer_wallet === publicKey.toBase58() && b.status !== 'withdrawn'
    );
    const existingAmount = myExistingBacking ? Number(myExistingBacking.amount_sol) : 0;
    const totalAfterBacking = existingAmount + amountSol;

    if (totalAfterBacking > maxBackingPerWallet) {
      const remainingAllowance = Math.max(0, maxBackingPerWallet - existingAmount);
      if (remainingAllowance <= 0) {
        setBackingStatus(
          `Error: You've reached the max backing limit of ${maxBackingPerWallet.toFixed(2)} SOL per wallet.`
        );
      } else {
        setBackingStatus(
          `Error: Max ${maxBackingPerWallet.toFixed(2)} SOL per wallet. You can only back ${remainingAllowance.toFixed(2)} more SOL.`
        );
      }
      return;
    }

    setBacking(true);
    setBackingStatus('Creating transaction...');

    try {
      // 1. Create SOL transfer transaction to escrow
      const escrowPubkey = new PublicKey(ESCROW_WALLET);
      const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: escrowPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      // 2. Send transaction via wallet
      setBackingStatus('Please approve in wallet...');
      const signature = await sendTransaction(transaction, connection);

      // 3. Wait briefly for transaction to propagate, then proceed
      // The API will verify the transaction - no need to wait for full confirmation
      setBackingStatus('Processing transaction...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 4. Register backing with API
      setBackingStatus('Registering backing...');
      const response = await fetch('/api/backings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meme_id: meme.id,
          backer_wallet: publicKey.toBase58(),
          amount_sol: amountSol,
          deposit_tx: signature,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to register backing');
      }

      setBackingStatus('Backing successful!');
      setAmount('');

      // Refresh meme data and backings to show updates
      await Promise.all([refetchMeme(), refetchBackings()]);

      // Clear status after a moment
      setTimeout(() => setBackingStatus(null), 3000);
    } catch (err) {
      console.error('Backing failed:', err);
      setBackingStatus(`Error: ${err instanceof Error ? err.message : 'Transaction failed'}`);
    } finally {
      setBacking(false);
    }
  };

  const handleTrade = () => {
    if (tradeType === 'back') {
      // Validate amount before showing confirmation
      const amountSol = parseFloat(amount);
      if (isNaN(amountSol) || amountSol <= 0) {
        setBackingStatus('Error: Please enter a valid amount');
        return;
      }

      // Pre-check backing limit before showing dialog
      if (meme) {
        const maxBackingPerWallet = Number(meme.backing_goal_sol) * 0.1;
        const myExistingBacking = backings.find(
          (b) => b.backer_wallet === publicKey?.toBase58() && b.status !== 'withdrawn'
        );
        const existingAmount = myExistingBacking ? Number(myExistingBacking.amount_sol) : 0;
        const totalAfterBacking = existingAmount + amountSol;

        if (totalAfterBacking > maxBackingPerWallet) {
          const remainingAllowance = Math.max(0, maxBackingPerWallet - existingAmount);
          if (remainingAllowance <= 0) {
            setBackingStatus(
              `Error: You've reached the max backing limit of ${maxBackingPerWallet.toFixed(2)} SOL per wallet.`
            );
          } else {
            setBackingStatus(
              `Error: Max ${maxBackingPerWallet.toFixed(2)} SOL per wallet. You can only back ${remainingAllowance.toFixed(2)} more SOL.`
            );
          }
          return;
        }
      }

      // Show confirmation dialog before backing
      setBackingStatus(null); // Clear any previous errors
      setShowBackConfirm(true);
    } else {
      // TODO: Implement buy/sell for launched tokens
      alert(`${tradeType === 'buy' ? 'Buying' : 'Selling'} ${amount} (Coming soon)`);
    }
  };

  const confirmBack = () => {
    setShowBackConfirm(false);
    handleBack();
  };

  const requestWithdraw = (backerWallet: string) => {
    // Find the backing amount for this wallet
    const backing = backings.find(b => b.backer_wallet === backerWallet);
    const amount = backing ? Number(backing.amount_sol) : 0;
    setPendingWithdrawAmount(amount);
    setPendingWithdrawWallet(backerWallet);
    setShowWithdrawConfirm(true);
  };

  const confirmWithdraw = () => {
    setShowWithdrawConfirm(false);
    if (pendingWithdrawWallet) {
      handleWithdraw(pendingWithdrawWallet);
      setPendingWithdrawWallet(null);
      setPendingWithdrawAmount(0);
    }
  };

  const requestLaunch = () => {
    setShowLaunchConfirm(true);
  };

  const confirmLaunch = async () => {
    setShowLaunchConfirm(false);
    if (!meme || launching) return;

    setLaunching(true);
    setLaunchStatus('Initiating launch...');

    try {
      const response = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meme_id: meme.id,
          caller_wallet: publicKey?.toBase58(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Launch failed');
      }

      setLaunchStatus('Token launched successfully!');

      // Refresh meme data to show updated status
      await refetchMeme();

      // Clear status after a moment
      setTimeout(() => setLaunchStatus(null), 5000);
    } catch (err) {
      console.error('Launch failed:', err);
      setLaunchStatus(`Error: ${err instanceof Error ? err.message : 'Launch failed'}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleWithdraw = async (backerWallet: string) => {
    if (!meme || withdrawing) return;

    setWithdrawing(true);
    setWithdrawStatus('Processing withdrawal...');

    try {
      const response = await fetch('/api/backings/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meme_id: meme.id,
          backer_wallet: backerWallet,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      setWithdrawStatus(`Successfully withdrew ${data.amount_refunded} SOL!`);

      // Refresh data to show updates
      await Promise.all([refetchMeme(), refetchBackings()]);

      // Clear status after a moment
      setTimeout(() => setWithdrawStatus(null), 5000);
    } catch (err) {
      console.error('Withdrawal failed:', err);
      setWithdrawStatus(`Error: ${err instanceof Error ? err.message : 'Withdrawal failed'}`);
    } finally {
      setWithdrawing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  // Error state
  if (error || !meme) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Proving Grounds
        </Link>
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Meme Not Found</h2>
          <p className="text-[var(--muted)]">{error || 'This meme does not exist.'}</p>
        </div>
      </div>
    );
  }

  const {
    name,
    symbol,
    description,
    status,
    backing_goal_sol,
    current_backing_sol,
    backing_deadline,
    creator_wallet,
    image_url,
    backer_count = 0,
    // Trust score params (with defaults for backwards compatibility)
    creator_fee_pct = 2,
    backer_share_pct = 70,
    dev_initial_buy_sol = 0,
    auto_refund = true,
  } = meme;

  // Calculate trust score breakdown
  const trustScoreBreakdown = calculateTrustScore({
    creator_fee_pct,
    backer_share_pct,
    dev_initial_buy_sol,
    auto_refund,
    backing_goal_sol: Number(backing_goal_sol),
    duration: Math.ceil((new Date(backing_deadline).getTime() - new Date(meme.created_at).getTime()) / (1000 * 60 * 60 * 24)),
  });

  const progress = (Number(current_backing_sol) / Number(backing_goal_sol)) * 100;
  const minBackers = 30; // From contract constants
  const backerProgress = (backer_count / minBackers) * 100;
  const timeRemaining = getTimeRemaining(backing_deadline);
  const { label: statusLabel, class: statusClass } = getStatusConfig(status);

  const isProving = status === 'backing';
  const isFunded = status === 'funded';
  const isLaunching = status === 'launching';
  const isLaunched = status === 'live';
  const maxBacking = Number(backing_goal_sol) * 0.1;
  const isCreator = connected && publicKey?.toBase58() === creator_wallet;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Proving Grounds
      </Link>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          {image_url ? (
            <img
              src={image_url}
              alt={name}
              className="w-20 h-20 rounded-2xl object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center text-3xl font-bold">
              {symbol.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            </div>
            <div className="text-lg text-[var(--muted)] mb-3">${symbol}</div>
            <p className="text-[var(--muted)]">{description}</p>
          </div>
        </div>

        {/* Creator Info */}
        <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[var(--muted)]">Created by:</span>
            <code className="bg-[var(--background)] px-2 py-1 rounded text-xs">
              {creator_wallet.slice(0, 8)}...{creator_wallet.slice(-8)}
            </code>
            <button
              onClick={() => handleCopy(creator_wallet)}
              className="text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              {copied ? <Check className="w-4 h-4 text-[var(--success)]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress / Stats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Launch Section - shown when funded */}
          {(isFunded || isLaunching) && (
            <div className="card p-6 space-y-4">
              <h2 className="text-lg font-semibold">
                {isLaunching ? 'Launching Token...' : 'Ready to Launch!'}
              </h2>

              <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg p-4">
                <p className="text-[var(--success)] font-medium mb-2">
                  Funding goal reached: {Number(current_backing_sol).toFixed(2)} / {Number(backing_goal_sol)} SOL
                </p>
                <p className="text-sm text-[var(--muted)]">
                  This meme has been fully funded and is ready to launch on pump.fun
                </p>
              </div>

              {/* Only creator can launch */}
              {isCreator ? (
                <button
                  onClick={requestLaunch}
                  disabled={launching || isLaunching}
                  className="w-full py-4 rounded-lg font-bold text-lg bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] text-white hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {launching || isLaunching ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Launching on pump.fun...
                    </span>
                  ) : (
                    'Launch Token on pump.fun'
                  )}
                </button>
              ) : (
                <div className="text-center py-3 text-sm text-[var(--muted)] bg-[var(--background)] rounded-lg">
                  {connected
                    ? 'Waiting for creator to launch...'
                    : 'Connect wallet to see launch status'}
                </div>
              )}

              {/* Launch status message */}
              {launchStatus && (
                <div className={`p-3 rounded-lg text-sm text-center ${
                  launchStatus.includes('Error')
                    ? 'bg-[var(--error)]/20 text-[var(--error)]'
                    : launchStatus.includes('successfully')
                    ? 'bg-[var(--success)]/20 text-[var(--success)]'
                    : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                }`}>
                  {launchStatus}
                </div>
              )}
            </div>
          )}

          {isProving && (
            <div className="card p-6 space-y-6">
              <h2 className="text-lg font-semibold">Proving Progress</h2>

              {/* SOL Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-[var(--muted)]">
                    <Target className="w-4 h-4" /> SOL Goal
                  </span>
                  <span className="font-medium">
                    {Number(current_backing_sol).toFixed(2)} / {Number(backing_goal_sol)} SOL ({progress.toFixed(1)}%)
                  </span>
                </div>
                <div className="progress-bar h-4">
                  <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
              </div>

              {/* Backers Progress */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="flex items-center gap-2 text-[var(--muted)]">
                    <Users className="w-4 h-4" /> Backers
                  </span>
                  <span className="font-medium">
                    {backer_count} / {minBackers} ({backerProgress.toFixed(1)}%)
                  </span>
                </div>
                <div className="progress-bar h-4">
                  <div className="progress-fill" style={{ width: `${Math.min(backerProgress, 100)}%` }} />
                </div>
              </div>

              {/* Time Remaining */}
              <div className="flex items-center justify-center gap-2 text-lg text-[var(--warning)]">
                <Clock className="w-5 h-5" />
                <span>{timeRemaining} remaining</span>
              </div>
            </div>
          )}

          {isLaunched && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold mb-4">Trading Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--background)] rounded-lg p-4">
                  <div className="text-sm text-[var(--muted)] mb-1">Price</div>
                  <div className="text-xl font-bold">-- SOL</div>
                </div>
                <div className="bg-[var(--background)] rounded-lg p-4">
                  <div className="text-sm text-[var(--muted)] mb-1">Volume (24h)</div>
                  <div className="text-xl font-bold">-- SOL</div>
                </div>
                <div className="bg-[var(--background)] rounded-lg p-4">
                  <div className="text-sm text-[var(--muted)] mb-1">Market Cap</div>
                  <div className="text-xl font-bold">--</div>
                </div>
                <div className="bg-[var(--background)] rounded-lg p-4">
                  <div className="text-sm text-[var(--muted)] mb-1">Curve Progress</div>
                  <div className="text-xl font-bold">--%</div>
                </div>
              </div>
            </div>
          )}

          {/* Trust Score */}
          <TrustScoreDisplay breakdown={trustScoreBreakdown} />

          {/* Rules */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Proving Rules</h2>
            <ul className="space-y-2 text-sm text-[var(--muted)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">•</span>
                Maximum backing per wallet: {maxBacking.toFixed(1)} SOL (10% of goal)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">•</span>
                Minimum backing for fee eligibility: 0.5 SOL
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">•</span>
                Genesis backers earn {backer_share_pct}% of all trading fees
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--accent)]">•</span>
                Creator fee: {creator_fee_pct}%
              </li>
              {dev_initial_buy_sol > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-[var(--warning)]">•</span>
                  Dev plans to buy: {dev_initial_buy_sol} SOL at launch
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className={auto_refund ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>•</span>
                {auto_refund
                  ? 'If goal not reached, automatic refund to all backers'
                  : 'Manual refunds if goal not reached'}
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--warning)]">•</span>
                Early withdrawal fee: 2% (to cover platform costs)
              </li>
            </ul>
          </div>
        </div>

        {/* Trading Panel */}
        <div className="card p-6 h-fit">
          <h2 className="text-lg font-semibold mb-4">
            {isProving ? 'Back This Meme' : 'Trade'}
          </h2>

          {!connected ? (
            <div className="text-center py-8 text-[var(--muted)]">
              Connect wallet to {isProving ? 'back' : 'trade'}
            </div>
          ) : (
            <>
              {isLaunched && (
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setTradeType('buy')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      tradeType === 'buy'
                        ? 'bg-[var(--success)] text-white'
                        : 'bg-[var(--background)] text-[var(--muted)]'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 inline mr-1" />
                    Buy
                  </button>
                  <button
                    onClick={() => setTradeType('sell')}
                    className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                      tradeType === 'sell'
                        ? 'bg-[var(--error)] text-white'
                        : 'bg-[var(--background)] text-[var(--muted)]'
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4 inline mr-1" />
                    Sell
                  </button>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-[var(--muted)] mb-2">
                    Amount ({isProving || tradeType === 'buy' ? 'SOL' : symbol})
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      min="0"
                      step="0.1"
                      className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none text-lg"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-2">
                      <button
                        onClick={() => setAmount('0.5')}
                        className="text-xs bg-[var(--card)] px-2 py-1 rounded hover:bg-[var(--border)]"
                      >
                        0.5
                      </button>
                      <button
                        onClick={() => setAmount('1')}
                        className="text-xs bg-[var(--card)] px-2 py-1 rounded hover:bg-[var(--border)]"
                      >
                        1
                      </button>
                      <button
                        onClick={() => setAmount(String(maxBacking))}
                        className="text-xs bg-[var(--card)] px-2 py-1 rounded hover:bg-[var(--border)]"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                </div>

                {isLaunched && amount && (
                  <div className="bg-[var(--background)] rounded-lg p-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--muted)]">You receive</span>
                      <span className="font-medium">-- {tradeType === 'buy' ? symbol : 'SOL'}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-[var(--muted)]">Fee (1%)</span>
                      <span>{(Number(amount) * 0.01).toFixed(4)}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleTrade}
                  disabled={!amount || Number(amount) <= 0 || backing}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    isProving
                      ? 'btn-primary'
                      : tradeType === 'buy'
                      ? 'bg-[var(--success)] hover:bg-[var(--success)]/90 text-white'
                      : 'bg-[var(--error)] hover:bg-[var(--error)]/90 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {backing ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    isProving ? 'Back Meme' : tradeType === 'buy' ? 'Buy Tokens' : 'Sell Tokens'
                  )}
                </button>

                {/* Status message */}
                {backingStatus && (
                  <div className={`mt-3 p-3 rounded-lg text-sm text-center ${
                    backingStatus.includes('Error')
                      ? 'bg-[var(--error)]/20 text-[var(--error)]'
                      : backingStatus.includes('successful')
                      ? 'bg-[var(--success)]/20 text-[var(--success)]'
                      : 'bg-[var(--accent)]/20 text-[var(--accent)]'
                  }`}>
                    {backingStatus}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Fee Info */}
          {isProving && (
            <div className="mt-4 p-3 bg-[var(--accent)]/10 rounded-lg">
              <p className="text-xs text-[var(--muted)]">
                Back 0.5+ SOL to qualify for genesis fee share ({backer_share_pct}% of trading fees)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Backers List and Chat Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Backers List */}
        <BackersList
          backings={backings}
          totalBacking={Number(current_backing_sol)}
          currentWallet={publicKey?.toBase58()}
          canWithdraw={isProving}
          onWithdraw={requestWithdraw}
          withdrawing={withdrawing}
          withdrawStatus={withdrawStatus}
        />

        {/* Investor Chat */}
        <MemeChat memeId={meme.id} />
      </div>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        isOpen={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        onConfirm={confirmBack}
        title="Confirm Backing"
        message={`You are about to send ${amount} SOL to back ${name}. This will be held in escrow until the token launches or you withdraw.`}
        confirmText={`Back ${amount} SOL`}
        variant="info"
        isLoading={backing}
      />

      <ConfirmDialog
        isOpen={showWithdrawConfirm}
        onClose={() => {
          setShowWithdrawConfirm(false);
          setPendingWithdrawWallet(null);
          setPendingWithdrawAmount(0);
        }}
        onConfirm={confirmWithdraw}
        title="Confirm Withdrawal"
        message={`Withdraw ${pendingWithdrawAmount.toFixed(4)} SOL?\n\nA 2% withdrawal fee (${(pendingWithdrawAmount * 0.02).toFixed(4)} SOL) will be deducted.\n\nYou will receive: ${(pendingWithdrawAmount * 0.98).toFixed(4)} SOL`}
        confirmText={`Withdraw ${(pendingWithdrawAmount * 0.98).toFixed(4)} SOL`}
        variant="warning"
        isLoading={withdrawing}
      />

      <ConfirmDialog
        isOpen={showLaunchConfirm}
        onClose={() => setShowLaunchConfirm(false)}
        onConfirm={confirmLaunch}
        title="Launch Token"
        message={`You are about to launch ${name} ($${symbol}) on pump.fun with ${Number(current_backing_sol).toFixed(2)} SOL backing. This action cannot be undone. Tokens will be distributed to all backers proportionally.`}
        confirmText="Launch Now"
        variant="info"
        isLoading={launching}
      />
    </div>
  );
}
