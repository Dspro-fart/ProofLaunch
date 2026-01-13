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
              to the escrow to show support. Your funds are held safely until launch or refund.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-[var(--success)] mt-0.5 flex-shrink-0" />
            <span className="text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Max 10% per wallet</strong> - No single
              wallet can back more than 10% of the goal, ensuring fair distribution.
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
              <span className="text-sm text-[var(--muted)]">0-10%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Lower creator fees = higher trust. This is the creator's cut of trading volume.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Backer Share</span>
              <span className="text-sm text-[var(--muted)]">50-90%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Higher backer share = higher trust. Genesis backers earn this % of trading fees.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Dev Initial Buy</span>
              <span className="text-sm text-[var(--muted)]">Disclosed amount</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Transparency about dev's planned purchase at launch. 0 SOL = no dev snipe = highest trust.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Auto Refund</span>
              <span className="text-sm text-[var(--muted)]">On/Off</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              If enabled, backers are automatically refunded if the goal isn't reached.
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
          <h2 className="text-2xl font-bold">Fee Breakdown</h2>
        </div>
        <p className="text-[var(--muted)] leading-relaxed">
          Understanding where fees come from and who receives them:
        </p>
        <div className="space-y-4 pt-2">
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-purple-500">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Platform Fee</span>
              <span className="text-sm font-semibold text-purple-400">2%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              A 2% fee is taken from the dev's initial buy at launch. This supports
              platform development and maintenance. No other platform fees are charged.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-[var(--accent)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Creator Fee</span>
              <span className="text-sm font-semibold text-[var(--accent)]">0-10%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Set by the creator when submitting. This percentage of all trading volume
              goes to the creator. Lower fees = higher trust score.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-[var(--success)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Backer Share</span>
              <span className="text-sm font-semibold text-[var(--success)]">50-90%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Genesis backers (0.5+ SOL) earn this percentage of trading fees forever.
              Higher share = higher trust score. Distributed proportionally to backing amount.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4 border-l-4 border-[var(--warning)]">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Pump.fun Fees</span>
              <span className="text-sm font-semibold text-[var(--warning)]">1%</span>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Pump.fun charges a 1% trading fee on all transactions. This is standard for
              all tokens launched on the platform and is separate from creator/backer fees.
            </p>
          </div>
        </div>
        <div className="bg-[var(--card)] rounded-lg p-4 mt-4">
          <h3 className="font-semibold mb-3">Example Fee Flow</h3>
          <p className="text-sm text-[var(--muted)] mb-3">
            For a token with 5% creator fee and 70% backer share, on a 1 SOL trade:
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Pump.fun fee (1%)</span>
              <span>0.01 SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Creator fee (5%)</span>
              <span>0.05 SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Backer pool (70% of 5%)</span>
              <span>0.035 SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Creator keeps (30% of 5%)</span>
              <span>0.015 SOL</span>
            </div>
            <div className="border-t border-[var(--border)] pt-2 mt-2 flex justify-between font-medium">
              <span>Total fees on trade</span>
              <span>0.06 SOL (6%)</span>
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
            <Zap className="w-6 h-6 text-[var(--warning)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Automatic Token Distribution</h3>
              <p className="text-sm text-[var(--muted)]">
                When a meme launches, tokens are automatically distributed to your wallet
                proportional to your backing. No claiming needed!
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <TrendingUp className="w-6 h-6 text-[var(--success)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Earn Trading Fees</h3>
              <p className="text-sm text-[var(--muted)]">
                Genesis backers (0.5+ SOL) earn a share of all trading fees forever.
                The backer share % determines your cut.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-4 bg-[var(--background)] rounded-lg">
            <Undo2 className="w-6 h-6 text-[var(--error)] flex-shrink-0" />
            <div>
              <h3 className="font-semibold mb-1">Withdraw Anytime</h3>
              <p className="text-sm text-[var(--muted)]">
                Changed your mind? Withdraw your backing before the token launches.
                Your SOL is returned directly to your wallet.
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
              <h3 className="font-semibold mb-1">Submit Your Meme</h3>
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
                Once fully funded, click "Launch" to deploy your token on Pump.fun.
                The backed SOL is used for initial liquidity, and tokens are distributed to backers.
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
          We believe in full transparency. All funds are held in an escrow wallet that anyone can verify on-chain.
          Our code is open source and available for audit.
        </p>

        {/* Escrow Wallet */}
        <div className="bg-[var(--background)] rounded-lg p-4 space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--accent)]" />
            Escrow Wallet
          </h3>
          <p className="text-sm text-[var(--muted)]">
            All backed SOL is held in this escrow wallet until launch or withdrawal:
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
          <p className="text-xs text-[var(--muted)]">
            You can verify the balance and all transactions at any time on Solscan.
          </p>
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
            href="https://github.com/Dspro-fart/ProofLaunch"
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

        {/* Key Code Paths */}
        <div className="bg-[var(--background)] rounded-lg p-4 space-y-3">
          <h3 className="font-semibold">Key Code to Review</h3>
          <ul className="text-sm text-[var(--muted)] space-y-2">
            <li>
              <code className="text-xs bg-[var(--card)] px-2 py-0.5 rounded">src/services/pumpfun.ts</code>
              <span className="block text-xs mt-1">Escrow wallet, refunds, token launches</span>
            </li>
            <li>
              <code className="text-xs bg-[var(--card)] px-2 py-0.5 rounded">src/app/api/backings/route.ts</code>
              <span className="block text-xs mt-1">Backing deposits and verification</span>
            </li>
            <li>
              <code className="text-xs bg-[var(--card)] px-2 py-0.5 rounded">src/app/api/backings/withdraw/route.ts</code>
              <span className="block text-xs mt-1">Withdrawal processing (2% fee)</span>
            </li>
          </ul>
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
            Your funds are held in an escrow wallet during the proving phase. Withdrawals
            and refunds are processed automatically. Always verify transaction signatures
            on Solscan.
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
              All backers are automatically refunded their SOL. If auto-refund is disabled,
              the creator must manually process refunds.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">How do I receive my tokens?</h3>
            <p className="text-sm text-[var(--muted)]">
              Tokens are automatically sent to your wallet after launch. They'll appear in
              your Phantom wallet within a few minutes of launch.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">Can I back multiple times?</h3>
            <p className="text-sm text-[var(--muted)]">
              Yes, but your total backing cannot exceed 10% of the goal. This ensures
              fair distribution among backers.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">What's the minimum backing amount?</h3>
            <p className="text-sm text-[var(--muted)]">
              The minimum is 0.01 SOL. However, to qualify for genesis fee share,
              you need to back at least 0.5 SOL.
            </p>
          </div>
          <div className="bg-[var(--background)] rounded-lg p-4">
            <h3 className="font-semibold mb-2">Where does the backed SOL go?</h3>
            <p className="text-sm text-[var(--muted)]">
              Backed SOL goes to an escrow wallet. On launch, it's used to purchase
              initial tokens on Pump.fun, which are then distributed to backers.
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
