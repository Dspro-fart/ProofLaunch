'use client';

import { useState, useRef, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/navigation';
import { Upload, Info, Rocket, AlertCircle, Image, Link2, X, CheckCircle, Shield } from 'lucide-react';
import { calculateTrustScore, getTrustScoreColor, getTrustScoreLabel, getTrustScoreBgColor } from '@/lib/trustScore';

// Validation helpers
const FORBIDDEN_WORDS = ['scam', 'rug', 'rugpull', 'hack', 'steal'];
const URL_PATTERN = /^https?:\/\/[^\s]+$/;
const TWITTER_PATTERN = /^https?:\/\/(x\.com|twitter\.com)\/[^\s]+$/i;
const TELEGRAM_PATTERN = /^https?:\/\/t\.me\/[^\s]+$/i;
const DISCORD_PATTERN = /^https?:\/\/discord\.(gg|com)\/[^\s]+$/i;

interface ValidationErrors {
  name?: string;
  symbol?: string;
  description?: string;
  twitter?: string;
  website?: string;
  telegram?: string;
  discord?: string;
}

function validateName(name: string): string | undefined {
  if (!name.trim()) return 'Name is required';
  if (name.trim().length < 2) return 'Name must be at least 2 characters';
  if (name.trim().length > 32) return 'Name must be 32 characters or less';
  if (FORBIDDEN_WORDS.some(word => name.toLowerCase().includes(word))) {
    return 'Name contains prohibited words';
  }
  if (!/^[a-zA-Z0-9\s\-_]+$/.test(name)) {
    return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
  }
  return undefined;
}

function validateSymbol(symbol: string): string | undefined {
  if (!symbol.trim()) return 'Symbol is required';
  if (symbol.trim().length < 2) return 'Symbol must be at least 2 characters';
  if (symbol.trim().length > 10) return 'Symbol must be 10 characters or less';
  if (!/^[A-Za-z0-9]+$/.test(symbol)) {
    return 'Symbol can only contain letters and numbers';
  }
  return undefined;
}

function validateDescription(description: string): string | undefined {
  if (description.length > 500) return 'Description must be 500 characters or less';
  if (FORBIDDEN_WORDS.some(word => description.toLowerCase().includes(word))) {
    return 'Description contains prohibited words';
  }
  return undefined;
}

function validateUrl(url: string, pattern?: RegExp, name?: string): string | undefined {
  if (!url) return undefined; // Optional field
  if (!URL_PATTERN.test(url)) return `Please enter a valid URL starting with http:// or https://`;
  if (pattern && !pattern.test(url)) return `Please enter a valid ${name} URL`;
  return undefined;
}

export default function SubmitPage() {
  const { connected, publicKey } = useWallet();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    solGoal: 10,
    duration: 3,
    twitter: '',
    website: '',
    telegram: '',
    discord: '',
    // Trust score parameters (default to generous/trusted settings)
    creatorFeePct: 2,
    backerSharePct: 70,
    devInitialBuySol: 0,
    autoRefund: true,
  });

  // Calculate trust score in real-time
  const trustScore = useMemo(() => {
    return calculateTrustScore({
      creator_fee_pct: formData.creatorFeePct,
      backer_share_pct: formData.backerSharePct,
      dev_initial_buy_sol: formData.devInitialBuySol,
      auto_refund: formData.autoRefund,
      backing_goal_sol: formData.solGoal,
      duration: formData.duration,
    });
  }, [formData.creatorFeePct, formData.backerSharePct, formData.devInitialBuySol, formData.autoRefund, formData.solGoal, formData.duration]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate all fields
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      name: validateName(formData.name),
      symbol: validateSymbol(formData.symbol),
      description: validateDescription(formData.description),
      twitter: validateUrl(formData.twitter, TWITTER_PATTERN, 'X/Twitter'),
      website: validateUrl(formData.website),
      telegram: validateUrl(formData.telegram, TELEGRAM_PATTERN, 'Telegram'),
      discord: validateUrl(formData.discord, DISCORD_PATTERN, 'Discord'),
    };

    // Remove undefined values
    Object.keys(errors).forEach(key => {
      if (errors[key as keyof ValidationErrors] === undefined) {
        delete errors[key as keyof ValidationErrors];
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate single field on blur
  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));

    let error: string | undefined;
    switch (field) {
      case 'name':
        error = validateName(formData.name);
        break;
      case 'symbol':
        error = validateSymbol(formData.symbol);
        break;
      case 'description':
        error = validateDescription(formData.description);
        break;
      case 'twitter':
        error = validateUrl(formData.twitter, TWITTER_PATTERN, 'X/Twitter');
        break;
      case 'website':
        error = validateUrl(formData.website);
        break;
      case 'telegram':
        error = validateUrl(formData.telegram, TELEGRAM_PATTERN, 'Telegram');
        break;
      case 'discord':
        error = validateUrl(formData.discord, DISCORD_PATTERN, 'Discord');
        break;
    }

    setFieldErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connected || !publicKey) return;

    // Mark all fields as touched to show errors
    setTouched({
      name: true,
      symbol: true,
      description: true,
      twitter: true,
      website: true,
      telegram: true,
      discord: true,
    });

    // Validate form
    if (!validateForm()) {
      setError('Please fix the errors above before submitting');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // For now, use a placeholder image URL
      // In production: upload to IPFS/Arweave first
      let imageUrl = 'https://placehold.co/400x400/1a1a2e/ffffff?text=' + formData.symbol;

      if (imageFile) {
        // TODO: Upload to IPFS
        // const formData = new FormData();
        // formData.append('file', imageFile);
        // const ipfsResponse = await fetch('/api/upload', { method: 'POST', body: formData });
        // imageUrl = (await ipfsResponse.json()).url;

        // For now, use data URL (not ideal for production)
        imageUrl = imagePreview || imageUrl;
      }

      const response = await fetch('/api/memes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_wallet: publicKey.toBase58(),
          name: formData.name,
          symbol: formData.symbol.toUpperCase(),
          description: formData.description,
          image_url: imageUrl,
          twitter: formData.twitter || undefined,
          telegram: formData.telegram || undefined,
          discord: formData.discord || undefined,
          website: formData.website || undefined,
          backing_goal_sol: formData.solGoal,
          backing_days: formData.duration,
          // Trust score parameters
          creator_fee_pct: formData.creatorFeePct,
          backer_share_pct: formData.backerSharePct,
          dev_initial_buy_sol: formData.devInitialBuySol,
          auto_refund: formData.autoRefund,
          trust_score: trustScore.total,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit meme');
      }

      const data = await response.json();
      setSuccess(true);

      // Redirect to the meme page after a short delay
      setTimeout(() => {
        router.push(`/meme/${data.meme.id}`);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? checked
        : ['solGoal', 'duration', 'creatorFeePct', 'backerSharePct', 'devInitialBuySol'].includes(name)
        ? Number(value)
        : value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-[var(--success)] mb-4" />
          <h2 className="text-2xl font-bold mb-2">Meme Submitted!</h2>
          <p className="text-[var(--muted)] mb-4">
            Your meme is now in the Proving Grounds. Redirecting...
          </p>
          <div className="w-8 h-8 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Submit Your Meme</span>
        </h1>
        <p className="text-[var(--muted)]">
          Launch your meme coin to the Proving Grounds
        </p>
      </div>

      {!connected ? (
        <div className="card p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-[var(--warning)] mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-[var(--muted)]">
            Please connect your wallet to submit a meme
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-lg p-4">
              <div className="flex gap-3 items-center">
                <AlertCircle className="w-5 h-5 text-[var(--error)]" />
                <p className="text-[var(--error)]">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Rocket className="w-5 h-5 text-[var(--accent)]" />
              Basic Information
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  onBlur={() => handleBlur('name')}
                  placeholder="e.g., Bonk Dog"
                  maxLength={32}
                  required
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none ${
                    touched.name && fieldErrors.name
                      ? 'border-[var(--error)] focus:border-[var(--error)]'
                      : 'border-[var(--border)] focus:border-[var(--accent)]'
                  }`}
                />
                <div className="flex justify-between mt-1">
                  {touched.name && fieldErrors.name ? (
                    <span className="text-xs text-[var(--error)]">{fieldErrors.name}</span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">Letters, numbers, spaces, hyphens</span>
                  )}
                  <span className="text-xs text-[var(--muted)]">{formData.name.length}/32</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Symbol *</label>
                <input
                  type="text"
                  name="symbol"
                  value={formData.symbol}
                  onChange={handleChange}
                  onBlur={() => handleBlur('symbol')}
                  placeholder="e.g., BONKD"
                  maxLength={10}
                  required
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none uppercase ${
                    touched.symbol && fieldErrors.symbol
                      ? 'border-[var(--error)] focus:border-[var(--error)]'
                      : 'border-[var(--border)] focus:border-[var(--accent)]'
                  }`}
                />
                <div className="flex justify-between mt-1">
                  {touched.symbol && fieldErrors.symbol ? (
                    <span className="text-xs text-[var(--error)]">{fieldErrors.symbol}</span>
                  ) : (
                    <span className="text-xs text-[var(--muted)]">Letters and numbers only</span>
                  )}
                  <span className="text-xs text-[var(--muted)]">{formData.symbol.length}/10</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                onBlur={() => handleBlur('description')}
                placeholder="Tell the community about your meme..."
                maxLength={500}
                rows={3}
                className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none resize-none ${
                  touched.description && fieldErrors.description
                    ? 'border-[var(--error)] focus:border-[var(--error)]'
                    : 'border-[var(--border)] focus:border-[var(--accent)]'
                }`}
              />
              <div className="flex justify-between mt-1">
                {touched.description && fieldErrors.description ? (
                  <span className="text-xs text-[var(--error)]">{fieldErrors.description}</span>
                ) : (
                  <span className="text-xs text-[var(--muted)]">Describe your meme</span>
                )}
                <span className="text-xs text-[var(--muted)]">{formData.description.length}/500</span>
              </div>
            </div>
          </div>

          {/* Image Upload */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Image className="w-5 h-5 text-[var(--accent)]" />
              Token Image
            </h2>

            <div className="flex gap-4">
              <div className="relative">
                {imagePreview ? (
                  <div className="relative w-32 h-32">
                    <img
                      src={imagePreview}
                      alt="Token preview"
                      className="w-32 h-32 rounded-xl object-cover border border-[var(--border)]"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--error)] rounded-full flex items-center justify-center hover:bg-[var(--error)]/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-32 h-32 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] transition-colors flex flex-col items-center justify-center gap-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                  >
                    <Upload className="w-8 h-8" />
                    <span className="text-xs">Upload</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              <div className="flex-1 text-sm text-[var(--muted)]">
                <p className="mb-2">Upload your token's image or logo.</p>
                <ul className="space-y-1 text-xs">
                  <li>• PNG, JPG, GIF, or WebP</li>
                  <li>• Max 5MB</li>
                  <li>• Square images work best (1:1 ratio)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-[var(--accent)]" />
              Social Links
              <span className="text-xs font-normal text-[var(--muted)]">(optional - shown on Axiom/Photon)</span>
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">X (Twitter)</label>
                <input
                  type="text"
                  name="twitter"
                  value={formData.twitter}
                  onChange={handleChange}
                  onBlur={() => handleBlur('twitter')}
                  placeholder="https://x.com/..."
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none ${
                    touched.twitter && fieldErrors.twitter
                      ? 'border-[var(--error)] focus:border-[var(--error)]'
                      : 'border-[var(--border)] focus:border-[var(--accent)]'
                  }`}
                />
                {touched.twitter && fieldErrors.twitter && (
                  <span className="text-xs text-[var(--error)]">{fieldErrors.twitter}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Website</label>
                <input
                  type="text"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  onBlur={() => handleBlur('website')}
                  placeholder="https://..."
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none ${
                    touched.website && fieldErrors.website
                      ? 'border-[var(--error)] focus:border-[var(--error)]'
                      : 'border-[var(--border)] focus:border-[var(--accent)]'
                  }`}
                />
                {touched.website && fieldErrors.website && (
                  <span className="text-xs text-[var(--error)]">{fieldErrors.website}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telegram</label>
                <input
                  type="text"
                  name="telegram"
                  value={formData.telegram}
                  onChange={handleChange}
                  onBlur={() => handleBlur('telegram')}
                  placeholder="https://t.me/..."
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none ${
                    touched.telegram && fieldErrors.telegram
                      ? 'border-[var(--error)] focus:border-[var(--error)]'
                      : 'border-[var(--border)] focus:border-[var(--accent)]'
                  }`}
                />
                {touched.telegram && fieldErrors.telegram && (
                  <span className="text-xs text-[var(--error)]">{fieldErrors.telegram}</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Discord</label>
                <input
                  type="text"
                  name="discord"
                  value={formData.discord}
                  onChange={handleChange}
                  onBlur={() => handleBlur('discord')}
                  placeholder="https://discord.gg/..."
                  className={`w-full px-4 py-3 rounded-lg bg-[var(--background)] border focus:outline-none ${
                    touched.discord && fieldErrors.discord
                      ? 'border-[var(--error)] focus:border-[var(--error)]'
                      : 'border-[var(--border)] focus:border-[var(--accent)]'
                  }`}
                />
                {touched.discord && fieldErrors.discord && (
                  <span className="text-xs text-[var(--error)]">{fieldErrors.discord}</span>
                )}
              </div>
            </div>
          </div>

          {/* Goals */}
          <div className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-[var(--accent)]" />
              Backing Goals
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">SOL Goal *</label>
                <select
                  name="solGoal"
                  value={formData.solGoal}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value={5}>5 SOL</option>
                  <option value={10}>10 SOL</option>
                  <option value={25}>25 SOL</option>
                  <option value={50}>50 SOL</option>
                  <option value={100}>100 SOL</option>
                </select>
                <span className="text-xs text-[var(--muted)]">Amount needed to launch</span>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Backing Duration *</label>
                <select
                  name="duration"
                  value={formData.duration}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--background)] border border-[var(--border)] focus:border-[var(--accent)] focus:outline-none"
                >
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* Trust Score Settings */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-[var(--accent)]" />
                Trust Score Settings
              </h2>
              <div className={`px-3 py-1 rounded-full ${getTrustScoreBgColor(trustScore.total)} flex items-center gap-2`}>
                <span className={`text-xl font-bold ${getTrustScoreColor(trustScore.total)}`}>
                  {trustScore.total}
                </span>
                <span className="text-xs text-[var(--muted)]">/100</span>
              </div>
            </div>
            <p className="text-sm text-[var(--muted)]">
              Set your parameters to build trust with backers. Higher trust scores attract more support.
            </p>

            {/* Creator Fee Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Creator Fee</label>
                <span className="text-sm font-semibold">{formData.creatorFeePct}%</span>
              </div>
              <input
                type="range"
                name="creatorFeePct"
                min="0"
                max="10"
                step="0.5"
                value={formData.creatorFeePct}
                onChange={handleChange}
                className="w-full h-2 bg-[var(--background)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>0% (Max trust)</span>
                <span>10% (Min trust)</span>
              </div>
            </div>

            {/* Backer Share Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Genesis Backer Share</label>
                <span className="text-sm font-semibold">{formData.backerSharePct}%</span>
              </div>
              <input
                type="range"
                name="backerSharePct"
                min="50"
                max="90"
                step="5"
                value={formData.backerSharePct}
                onChange={handleChange}
                className="w-full h-2 bg-[var(--background)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>50% of trading fees</span>
                <span>90% of trading fees</span>
              </div>
            </div>

            {/* Dev Initial Buy */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Your Initial Buy</label>
                <span className="text-sm font-semibold">
                  {formData.devInitialBuySol === 0 ? 'None' : `${formData.devInitialBuySol} SOL`}
                </span>
              </div>
              <input
                type="range"
                name="devInitialBuySol"
                min="0"
                max={formData.solGoal}
                step="0.5"
                value={formData.devInitialBuySol}
                onChange={handleChange}
                className="w-full h-2 bg-[var(--background)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--muted)]">
                <span>0 SOL (No snipe - max trust)</span>
                <span>{formData.solGoal} SOL (Buying all)</span>
              </div>
            </div>

            {/* Auto Refund Toggle */}
            <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg">
              <div>
                <label className="text-sm font-medium">Auto-Refund on Failure</label>
                <p className="text-xs text-[var(--muted)]">
                  Automatically refund backers if goal isn't reached
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="autoRefund"
                  checked={formData.autoRefund}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent)]"></div>
              </label>
            </div>

            {/* Trust Score Breakdown */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <div className="text-sm font-medium mb-2">Score Breakdown</div>
              <div className="space-y-1">
                {trustScore.components.map((component, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--muted)]">{component.label}: {component.value}</span>
                    <span className={component.points >= component.maxPoints * 0.7 ? 'text-green-500' : component.points >= component.maxPoints * 0.4 ? 'text-yellow-500' : 'text-red-500'}>
                      +{component.points}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border)] flex justify-between items-center">
                <span className={`font-semibold ${getTrustScoreColor(trustScore.total)}`}>
                  {getTrustScoreLabel(trustScore.total)}
                </span>
                <span className={`text-lg font-bold ${getTrustScoreColor(trustScore.total)}`}>
                  {trustScore.total}/100
                </span>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-[var(--accent)] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-[var(--accent)] mb-1">How it works</p>
                <p className="text-[var(--muted)]">
                  Once your meme reaches its SOL goal, it will automatically launch on Pump.fun.
                  Your token will be instantly visible on Axiom, Photon, and other aggregators.
                  If the goal isn't reached, backers get their SOL back.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.name || !formData.symbol || Object.keys(fieldErrors).some(k => fieldErrors[k as keyof ValidationErrors])}
            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Rocket className="w-5 h-5" />
                Submit to Proving Grounds
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}
