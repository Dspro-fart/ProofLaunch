'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  Rocket,
  Users,
  Shield,
  Coins,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Undo2,
  Zap,
  Receipt,
  Key,
  Wallet,
} from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Back Button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Proving Grounds
      </Link>

      {/* Header */}
      <div className="text-center space-y-4 py-6">
        <h1 className="text-4xl font-bold">
          <span className="gradient-text">Documentation</span>
        </h1>
        <p className="text-lg text-[var(--muted)]">
          Everything you need to know about Proof Launch
        </p>
      </div>

      {/* What is Proof Launch */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent)]/20">
            <Rocket className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold">What is Proof Launch?</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          Proof Launch is a community-curated meme coin launchpad on Solana. Unlike traditional
          launches where developers control everything, here <strong>communities form BEFORE
          tokens launch</strong>. Backers pool SOL to prove interest in a meme, and once the
          goal is reached, the token launches on Pump.fun with backers receiving tokens
          proportional to their contribution.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="bg-[var(--background)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">1</div>
            <div className="text-sm text-[var(--muted)]">Submit a Meme</div>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">2</div>
            <div className="text-sm text-[var(--muted)]">Community Backs It</div>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[var(--accent)]">3</div>
            <div className="text-sm text-[var(--muted)]">Launch on Pump.fun</div>
          </div>
        </div>
      </section>

      {/* How Backing Works - Burner Wallets */}
      <section className="card p-6 space-y-4 border-[var(--accent)]/30 border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent)]/20">
            <Key className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold">How Backing Works</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          When you back a meme, a unique <strong>burner wallet</strong> is created just for your backing.
          This is the key innovation that makes Proof Launch different from other launchpads.
        </p>
        <div className="space-y-4 pt-2">
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">You Back a Meme</h3>
              <p className="text-sm text-[var(--muted)]">
                When you click "Back This Meme", a fresh keypair (burner wallet) is generated in your browser.
                Your SOL goes directly to this burner wallet - not to a shared pool.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Token Launches</h3>
              <p className="text-sm text-[var(--muted)]">
                When the goal is reached and the creator launches, each burner wallet executes its own buy
                on Pump.fun. <strong>Earlier backers get better prices</strong> because they're first on the bonding curve!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Transfer Your Tokens</h3>
              <p className="text-sm text-[var(--muted)]">
                After launch, your tokens are in your burner wallet. Go to Portfolio and click "Transfer"
                to move them to your main wallet. You can also export the private key to import into Phantom.
              </p>
            </div>
          </div>
        </div>
        <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-lg p-4 mt-4">
          <h3 className="font-semibold text-[var(--success)] mb-2">Why Burner Wallets?</h3>
          <ul className="text-sm text-[var(--muted)] space-y-1">
            <li>• <strong>Organic on-chain activity:</strong> Each buy is a separate transaction from a unique wallet</li>
            <li>• <strong>Fair ordering:</strong> Earlier backers buy first and get better prices</li>
            <li>• <strong>No front-running:</strong> Nobody can snipe ahead of the community</li>
            <li>• <strong>Transparent:</strong> All buys are visible on-chain from identifiable wallets</li>
          </ul>
        </div>
      </section>

      {/* The Proving Phase */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--warning)]/20">
            <Clock className="w-6 h-6 text-[var(--warning)]" />
          </div>
          <h2 className="text-2xl font-bold">The Proving Phase</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          When a meme is submitted, it enters the "Proving" phase. During this time:
        </p>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Backers pledge SOL</strong> - Send SOL
              to your burner wallet to show support. Your funds stay in your burner until launch.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Max 20% per wallet</strong> - No single
              wallet can back more than 20% of the goal, ensuring fair distribution.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Withdraw anytime</strong> - Changed your
              mind? Withdraw your backing before launch (2% withdrawal fee helps cover operational costs).
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Time-limited</strong> - Each meme has a
              deadline. If the goal isn't reached, all backers are automatically refunded.
            </span>
          </li>
        </ul>
      </section>

      {/* Trust Score */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--success)]/20">
            <Shield className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h2 className="text-2xl font-bold">Trust Score</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          Every meme has a Trust Score (0-100) calculated from creator-set parameters.
          Higher scores indicate more backer-friendly terms:
        </p>
        <div className="space-y-4 pt-2">
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Creator Fee</span>
              <span className="text-sm text-[var(--muted)]">0-10% (30 pts max)</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Lower creator fees = higher trust. This is the creator's cut of trading volume.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Backer Share</span>
              <span className="text-sm text-[var(--muted)]">50-90% (30 pts max)</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Higher backer share = higher trust. Genesis backers earn this % of trading fees.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Dev Initial Buy</span>
              <span className="text-sm text-[var(--muted)]">Disclosed amount (30 pts max)</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Transparency about dev's planned purchase at launch. 0 SOL = no dev snipe = highest trust.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Backing Duration</span>
              <span className="text-sm text-[var(--muted)]">1-7 days (10 pts max)</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Longer backing periods give the community more time to research and decide.
            </p>
          </div>
        </div>
        <div className="flex gap-4 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <span className="text-sm text-[var(--muted)]">80+ Excellent</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <span className="text-sm text-[var(--muted)]">60-79 Good</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-400"></div>
            <span className="text-sm text-[var(--muted)]">40-59 Fair</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span className="text-sm text-[var(--muted)]">&lt;40 Risky</span>
          </div>
        </div>
      </section>

      {/* Fee Breakdown */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Receipt className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-2xl font-bold">Platform Fees</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          Proof Launch is designed to be self-sustaining with minimal fees. Here's the complete breakdown:
        </p>
        <div className="space-y-4 pt-2">
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-[var(--accent)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Creation Fee</span>
              <span className="text-sm font-semibold text-[var(--accent)]">0.02 SOL</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              One-time fee when submitting a meme. Covers token creation costs on Pump.fun
              (metadata rent, transaction fees).
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-[var(--success)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Platform Fee (Backing)</span>
              <span className="text-sm font-semibold text-[var(--success)]">2%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Added to each backing. If you back 1 SOL, you pay 1.02 SOL total. The 0.02 SOL
              goes to platform operations.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-[var(--warning)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Withdrawal Fee</span>
              <span className="text-sm font-semibold text-[var(--warning)]">2%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              If you withdraw your backing before launch, 2% is deducted. This discourages
              frivolous backing/withdrawing and covers operational costs.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Trading Fees</span>
              <span className="text-sm font-semibold text-purple-400">0% platform cut</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              100% of Pump.fun creator fees go to backers and the creator. The platform takes
              nothing from ongoing trading activity.
            </p>
          </div>
        </div>
      </section>

      {/* Trading Fee Distribution */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--success)]/20">
            <TrendingUp className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h2 className="text-2xl font-bold">Trading Fee Distribution</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          <strong className="text-[var(--foreground)]">100% of pump.fun creator fees are distributed</strong> to
          backers and creators. No platform cut on trading fees!
        </p>
        <div className="bg-[var(--warning)]/10 border border-[var(--warning)]/30 rounded-lg p-4">
          <p className="text-sm text-[var(--muted)]">
            <strong className="text-[var(--warning)]">Important:</strong> Creators must back their own meme
            to receive a share of trading fees. If you don't back, 100% of creator fees go to backers.
            This ensures creators have skin in the game alongside the community.
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-4 mt-4">
          <h3 className="font-semibold mb-3">Example: How Fees Flow</h3>
          <p className="text-sm text-[var(--muted)] mb-3">
            Token with 5% creator fee. When someone trades 100 SOL on pump.fun:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Pump.fun fee (1%)</span>
              <span>1.0 SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">→ Creator fee to escrow (0.5%)</span>
              <span>0.5 SOL</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 mt-2">
              <div className="text-xs text-[var(--muted)] mb-2">ProofLaunch distributes the 0.5 SOL:</div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Creator gets (5%)</span>
                <span>0.025 SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Backers split (95%)</span>
                <span>0.475 SOL</span>
              </div>
            </div>
            <div className="border-t border-[var(--border)] pt-2 mt-2 flex justify-between font-medium text-[var(--success)]">
              <span>Platform keeps</span>
              <span>0 SOL</span>
            </div>
          </div>
        </div>
      </section>

      {/* For Backers */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent)]/20">
            <Users className="w-6 h-6 text-[var(--accent)]" />
          </div>
          <h2 className="text-2xl font-bold">For Backers</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <Coins className="w-6 h-6 text-[var(--accent)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Back Memes You Believe In</h3>
              <p className="text-sm text-[var(--muted)]">
                Browse the Proving Grounds and back memes with SOL. Your backing shows community
                support and helps reach the launch goal.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <Key className="w-6 h-6 text-[var(--warning)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Your Own Burner Wallet</h3>
              <p className="text-sm text-[var(--muted)]">
                Each backing creates a unique wallet. You can export the private key and import
                it into Phantom for full control of your tokens.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <Zap className="w-6 h-6 text-[var(--success)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Early Backers Get Better Prices</h3>
              <p className="text-sm text-[var(--muted)]">
                Burner wallets buy in order of backing time. Be early to get lower prices
                on the bonding curve and more tokens for your SOL!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <Wallet className="w-6 h-6 text-purple-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Transfer or Sell After Launch</h3>
              <p className="text-sm text-[var(--muted)]">
                After launch, visit your Portfolio to transfer tokens to your main wallet,
                or sell directly from the burner. You have full control.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <Undo2 className="w-6 h-6 text-[var(--error)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Withdraw Anytime</h3>
              <p className="text-sm text-[var(--muted)]">
                Changed your mind? Withdraw your backing before the token launches.
                Your SOL is returned directly to your wallet (minus 2% fee).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* For Creators */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--gradient-start)]/20">
            <Rocket className="w-6 h-6 text-[var(--gradient-start)]" />
          </div>
          <h2 className="text-2xl font-bold">For Creators</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="font-semibold mb-1">Submit Your Meme (0.02 SOL)</h3>
              <p className="text-sm text-[var(--muted)]">
                Create your meme with name, symbol, description, and image. Set your trust
                parameters (creator fee, backer share, etc.) and backing goal.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="font-semibold mb-1">Build Community</h3>
              <p className="text-sm text-[var(--muted)]">
                Share your meme page, engage in the investor chat, and rally backers
                to reach your goal before the deadline.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <div className="w-6 h-6 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="font-semibold mb-1">Launch on Pump.fun</h3>
              <p className="text-sm text-[var(--muted)]">
                Once fully funded, click "Launch" to deploy your token on Pump.fun with 0 dev buy.
                Each backer's burner wallet then buys tokens in order of backing time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Transparency */}
      <section className="card p-6 space-y-4 border-[var(--success)]/30 border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--success)]/20">
            <Shield className="w-6 h-6 text-[var(--success)]" />
          </div>
          <h2 className="text-2xl font-bold">Security & Transparency</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          We believe in full transparency. All funds flow is verifiable on-chain.
          Our code is open source and available for audit.
        </p>

        {/* Escrow Wallet */}
        <div className="bg-[var(--background)] rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--accent)]" />
            Platform Escrow Wallet
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Platform fees (creation, backing fees, withdrawal fees) go to this wallet.
            This funds token creation costs and platform operations:
          </p>
          <div className="flex items-center gap-2 bg-[var(--card)] p-3 rounded-lg">
            <code className="text-xs md:text-sm font-mono flex-1 break-all">
              HfkGmHTpQigABpkSK3ECETTxdBgFyt2CgYVoCLDqDffv
            </code>
            <a
              href="https://solscan.io/account/HfkGmHTpQigABpkSK3ECETTxdBgFyt2CgYVoCLDqDffv"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-medium rounded hover:opacity-90 transition-opacity whitespace-nowrap"
            >
              View on Solscan
            </a>
          </div>
        </div>

        {/* Burner Wallet Security */}
        <div className="bg-[var(--background)] rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Key className="w-5 h-5 text-[var(--warning)]" />
            Burner Wallet Security
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Your backing goes to your own burner wallet, not a shared pool. The private key
            is encrypted and stored server-side until launch. After launch, you can:
          </p>
          <ul className="text-sm text-[var(--muted)] space-y-1 list-disc list-inside">
            <li>Export the private key and import into Phantom</li>
            <li>Transfer tokens directly from Portfolio</li>
            <li>Sell tokens directly from Portfolio</li>
          </ul>
        </div>

        {/* Open Source */}
        <div className="bg-[var(--background)] rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Open Source Code
          </h3>
          <p className="text-sm text-[var(--muted)]">
            Our entire codebase is open source. Review the code, verify the escrow logic,
            or contribute improvements.
          </p>
          <a
            href="https://github.com/anthropics/proof-of-meme"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-sm font-medium hover:bg-[var(--background)] transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            View on GitHub
          </a>
        </div>
      </section>

      {/* Safety & Risks */}
      <section className="card p-6 space-y-4 border-[var(--warning)]/30 border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--warning)]/20">
            <AlertTriangle className="w-6 h-6 text-[var(--warning)]" />
          </div>
          <h2 className="text-2xl font-bold">Safety & Risks</h2>
        </div>
        <div className="space-y-3 text-[var(--muted)]">
          <p>
            <strong className="text-[var(--foreground)]">This is not financial advice.</strong> Meme
            coins are highly speculative and volatile. Only invest what you can afford to lose.
          </p>
          <ul className="space-y-2 list-disc list-inside">
            <li>Always check the Trust Score before backing</li>
            <li>Research the creator and community</li>
            <li>Understand that most meme coins go to zero</li>
            <li>The platform does not guarantee any returns</li>
            <li>Smart contract risks exist - use at your own risk</li>
          </ul>
          <p className="text-sm pt-2">
            Your backing goes to your own burner wallet, not a shared pool. Withdrawals
            and refunds are processed automatically from your burner. Always verify
            transaction signatures on Solscan.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="card p-6 space-y-4">
        <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">What happens if the goal isn't reached?</h3>
            <p className="text-sm text-[var(--muted)]">
              All backers are automatically refunded their SOL from their burner wallets.
              Refunds are always automatic - there's no manual process.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">How do I get my tokens after launch?</h3>
            <p className="text-sm text-[var(--muted)]">
              Your tokens are in your burner wallet after launch. Go to Portfolio and click
              "Transfer" to move them to your main wallet, or "Export Key" to import the
              burner wallet into Phantom for full control.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">Why do earlier backers get better prices?</h3>
            <p className="text-sm text-[var(--muted)]">
              Each burner wallet buys tokens in order of when you backed. Pump.fun uses a
              bonding curve where price increases with each purchase. Being first = lower price!
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">Can I back multiple times?</h3>
            <p className="text-sm text-[var(--muted)]">
              Currently one backing per wallet per meme. Withdraw first if you want to
              change your backing amount.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">What's the minimum backing amount?</h3>
            <p className="text-sm text-[var(--muted)]">
              The minimum is 0.01 SOL. Maximum is 20% of the goal to ensure fair distribution.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">Where does my backed SOL go?</h3>
            <p className="text-sm text-[var(--muted)]">
              Your SOL goes to your own burner wallet (unique keypair). On launch, that wallet
              executes a buy on Pump.fun. The tokens stay in the burner until you transfer them.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="text-center space-y-4 py-8">
        <p className="text-[var(--muted)]">Ready to get started?</p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/"
            className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Browse Memes
          </Link>
          <Link
            href="/submit"
            className="px-6 py-3 rounded-lg bg-[var(--card)] border border-[var(--border)] font-semibold hover:bg-[var(--background)] transition-colors"
          >
            Submit a Meme
          </Link>
        </div>
      </div>
    </div>
  );
}
