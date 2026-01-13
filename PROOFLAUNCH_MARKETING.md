# ProofLaunch Marketing & Documentation

## 1. X Community Bio / Description

**Short (160 chars):**
```
Community-backed meme coin launchpad. Prove demand BEFORE launch. Back memes with SOL, get tokens when they go live on pump.fun. No more rugs.
```

**Medium (280 chars):**
```
The proving grounds for meme coins. Communities form BEFORE tokens launch. Back memes you believe in with SOL, get genesis tokens when they hit their goal and launch on pump.fun. Transparent trust scores. No more blind launches. prooflaunch.fun
```

---

## 2. X Posts

### Launch Announcement
```
Introducing ProofLaunch - the proving grounds for meme coins

No more buying into tokens with zero community

Here's how it works:
1. Creator submits a meme
2. Community backs it with SOL
3. Hit the goal = token launches on pump.fun
4. Backers get genesis tokens

Demand is proven BEFORE launch

prooflaunch.fun
```

### How It Works Thread
```
How to use ProofLaunch (thread)

1/ Find a meme you believe in at prooflaunch.fun

Each meme shows:
- Funding goal
- Time remaining
- Trust score
- Current backers

2/ Connect your wallet and back with SOL

Your SOL goes to escrow (not the creator)
Max 10% of goal per wallet to prevent whales
Min 0.5 SOL to qualify for genesis benefits

3/ Watch the community grow

Chat with other backers
Track progress in real-time
Withdraw anytime (2% fee) if you change your mind

4/ Goal reached = Launch

Token automatically deploys on pump.fun
Backers receive tokens proportionally
2% platform fee, rest goes to liquidity

5/ If goal isn't reached?

Your SOL is refunded automatically
No rug. No loss (minus withdrawal fee if you left early)

This is how meme coins should launch.

prooflaunch.fun
```

### Trust Score Explainer
```
How do you know a meme coin won't rug?

ProofLaunch Trust Scores

Every meme gets scored on:
- Creator fee % (lower = better)
- Backer share of fees
- Dev's planned buy at launch
- Auto-refund if goal fails
- Funding goal size
- Campaign duration

Green = safer
Red = riskier

Make informed decisions. Not blind bets.

prooflaunch.fun
```

### For Creators
```
Launching a meme coin?

Don't launch to crickets.

ProofLaunch lets you:
- Prove demand before deploying
- Build community during funding
- Launch with guaranteed liquidity
- Get visibility from day one

Submit your meme. Set your goal. Let the community decide.

prooflaunch.fun/submit
```

### FOMO Post
```
The meta is changing.

Buying random pump.fun launches = gambling

Backing proven communities = investing

ProofLaunch memes have:
- Real backers before launch
- Transparent trust scores
- Automatic refunds if goals fail
- Genesis holder benefits

Smart money backs before launch.

prooflaunch.fun
```

---

## 3. Technical Documentation

### Overview

ProofLaunch is a community-backed meme coin launchpad built on Solana. It solves the "launch to zero" problem by requiring tokens to prove community demand before deploying to pump.fun.

### Architecture

**Stack:**
- Frontend: Next.js 16 (App Router)
- Database: Supabase (PostgreSQL + Realtime)
- Blockchain: Solana mainnet
- Token Launch: pump.fun SDK
- Hosting: Vercel

**Key Components:**

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                   │
├─────────────────────────────────────────────────────────┤
│  Home Page    │  Meme Detail  │  Submit  │  Portfolio   │
│  - Meme grid  │  - Back/trade │  - Create│  - My backs  │
│  - Filters    │  - Chat       │  - Upload│  - Status    │
│  - Search     │  - Backers    │  - Goal  │  - Withdraw  │
└───────────────┴───────────────┴──────────┴──────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    API Routes (Next.js)                  │
├─────────────────────────────────────────────────────────┤
│  /api/memes      - CRUD for meme submissions            │
│  /api/backings   - Create/list backings                 │
│  /api/backings/withdraw - Process withdrawals           │
│  /api/launch     - Trigger pump.fun deployment          │
│  /api/chat       - Backer chat messages                 │
│  /api/refund     - Auto-refund failed campaigns         │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                      Supabase                            │
├─────────────────────────────────────────────────────────┤
│  Tables:                                                 │
│  - memes (id, name, symbol, status, goal, deadline...)  │
│  - backings (meme_id, wallet, amount, status, tx...)    │
│  - users (wallet_address, created_at)                   │
│  - chat_messages (meme_id, wallet, message)             │
│                                                          │
│  Triggers:                                               │
│  - Auto-update current_backing_sol on backing change    │
│  - Auto-update backer_count                             │
│  - Auto-set status to 'funded' when goal reached        │
│                                                          │
│  Realtime: Enabled for memes, backings, chat            │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                    Solana Mainnet                        │
├─────────────────────────────────────────────────────────┤
│  Escrow Wallet: HfkGmHTpQigABpkSK3ECETTxdBgFyt2CgYVoCLDqDffv │
│  - Receives all backing deposits                         │
│  - Processes withdrawals (98% to user, 2% stays)        │
│  - Funds token launches on pump.fun                      │
│  - Distributes tokens to backers post-launch            │
│                                                          │
│  Platform Wallet: CZnvVTTutAF7QTh5reQqRHE5i8J9cm1CWwaiQXi3QaXm │
│  - Receives 2% platform fee on launches                  │
└─────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────┐
│                      pump.fun                            │
├─────────────────────────────────────────────────────────┤
│  - Token creation via SDK                                │
│  - IPFS metadata upload                                  │
│  - Initial dev buy with backed SOL                       │
│  - Bonding curve trading                                 │
└─────────────────────────────────────────────────────────┘
```

### Meme Lifecycle

```
1. PENDING    - Just submitted, awaiting approval (if moderation enabled)
2. BACKING    - Active funding campaign
3. FUNDED     - Goal reached, ready to launch
4. LAUNCHING  - Token creation in progress
5. LIVE       - Successfully launched on pump.fun
6. FAILED     - Deadline passed without reaching goal
```

### Backing Flow

```
User clicks "Back" →
  Frontend validates amount (min 0.01, max 10% of goal) →
    Creates SOL transfer to escrow wallet →
      User signs in wallet →
        Transaction confirmed on-chain →
          POST /api/backings with tx signature →
            Backend verifies tx on-chain →
              Creates backing record in database →
                Trigger updates meme's current_backing_sol →
                  If goal reached: status → 'funded'
```

### Withdrawal Flow

```
User clicks "Withdraw" →
  Confirmation dialog shows 2% fee →
    POST /api/backings/withdraw →
      Backend calculates: refund = amount * 0.98 →
        Escrow sends refund to user wallet →
          Backing status → 'withdrawn' →
            Trigger updates meme's current_backing_sol
```

### Launch Flow

```
Creator clicks "Launch" (when status = 'funded') →
  POST /api/launch →
    Upload metadata to pump.fun IPFS →
      Create token via pump.fun SDK →
        Dev buy with (total_backing - 2% platform fee) →
          Transfer platform fee to platform wallet →
            Distribute tokens to backers proportionally →
              Update meme: status → 'live', mint_address, pump_fun_url
```

### Trust Score Algorithm

```typescript
function calculateTrustScore(params) {
  let score = 100;

  // Creator fee (0-5% is good, >10% is concerning)
  if (params.creator_fee_pct > 10) score -= 30;
  else if (params.creator_fee_pct > 5) score -= 15;

  // Backer share (higher = better)
  if (params.backer_share_pct < 50) score -= 20;
  else if (params.backer_share_pct >= 70) score += 10;

  // Dev initial buy (0 is best, high amounts are concerning)
  if (params.dev_initial_buy_sol > 5) score -= 25;
  else if (params.dev_initial_buy_sol > 2) score -= 10;

  // Auto-refund (enabled = trustworthy)
  if (!params.auto_refund) score -= 15;

  // Goal size (very small goals are suspicious)
  if (params.backing_goal_sol < 5) score -= 10;

  // Duration (too short = rushed, too long = abandoned)
  if (params.duration < 3) score -= 10;
  if (params.duration > 30) score -= 5;

  return Math.max(0, Math.min(100, score));
}
```

### Fee Structure

| Fee | Amount | Recipient |
|-----|--------|-----------|
| Platform fee on launch | 2% of total backing | Platform wallet |
| Early withdrawal fee | 2% of backing amount | Stays in escrow |
| Backing fee | None | - |

### Security Measures

1. **Rate Limiting**
   - 10 meme submissions per hour per wallet
   - 5 backing requests per minute per wallet
   - 3 withdrawal requests per minute per wallet
   - 10 chat messages per minute per wallet
   - 2 launch attempts per minute per meme

2. **Input Validation**
   - Wallet address format verification
   - Amount bounds checking
   - XSS sanitization on chat messages
   - SQL injection prevention via Supabase parameterized queries

3. **On-chain Verification**
   - All backing deposits verified on-chain before recording
   - Transaction signature, amount, and recipient checked

4. **Escrow Protection**
   - Max 10% backing per wallet prevents whale manipulation
   - Funds held in platform escrow, not creator wallets
   - Balance checks before processing withdrawals

### Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# Wallets
ESCROW_WALLET_PRIVATE_KEY=
PLATFORM_WALLET_ADDRESS=
```

### API Reference

**GET /api/memes**
- Query params: `status` (all|backing|live|failed)
- Returns: Array of meme objects with backer counts

**GET /api/memes/[id]**
- Returns: Single meme with full details

**POST /api/memes**
- Body: `{ name, symbol, description, image_url, backing_goal_sol, duration_hours, creator_wallet, ... }`
- Returns: Created meme object

**GET /api/backings**
- Query params: `meme_id`, `backer`
- Returns: Array of backing objects with meme details

**POST /api/backings**
- Body: `{ meme_id, backer_wallet, amount_sol, deposit_tx }`
- Returns: Created backing object

**POST /api/backings/withdraw**
- Body: `{ meme_id, backer_wallet }`
- Returns: `{ success, original_amount, withdrawal_fee, amount_refunded, refund_tx }`

**POST /api/launch**
- Body: `{ meme_id, caller_wallet }`
- Returns: `{ success, mint_address, pump_fun_url, ... }`

**GET /api/chat**
- Query params: `meme_id`
- Returns: Array of chat messages

**POST /api/chat**
- Body: `{ meme_id, wallet_address, message }`
- Returns: Created message object

---

## Links

- Website: https://prooflaunch.fun
- Escrow: `HfkGmHTpQigABpkSK3ECETTxdBgFyt2CgYVoCLDqDffv`
- Platform: `CZnvVTTutAF7QTh5reQqRHE5i8J9cm1CWwaiQXi3QaXm`
