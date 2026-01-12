import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { launchToken, LaunchConfig, distributeTokensToBackers, BackerInfo } from '@/services/pumpfun';
import { rateLimiters } from '@/lib/rateLimit';

// POST /api/launch - Launch a funded meme token
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { meme_id, caller_wallet } = body;

    if (!meme_id) {
      return NextResponse.json(
        { error: 'Missing meme_id' },
        { status: 400 }
      );
    }

    // Rate limiting - 2 launch attempts per minute per meme
    const rateLimitResult = rateLimiters.launch(meme_id);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Launch already in progress. Please wait.' },
        { status: 429 }
      );
    }

    // Get meme
    const { data: meme, error: memeError } = await supabase
      .from('memes')
      .select('*')
      .eq('id', meme_id)
      .single();

    if (memeError || !meme) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    // Verify caller is the creator (if caller_wallet provided)
    if (caller_wallet && caller_wallet !== meme.creator_wallet) {
      return NextResponse.json(
        { error: 'Only the creator can launch this token' },
        { status: 403 }
      );
    }

    // Check if meme is ready to launch
    if (meme.status !== 'funded') {
      return NextResponse.json(
        { error: `Meme is not ready to launch (status: ${meme.status}, need: funded)` },
        { status: 400 }
      );
    }

    // Update status to launching
    await supabase
      .from('memes')
      .update({ status: 'launching' })
      .eq('id', meme_id);

    // Prepare launch config
    const config: LaunchConfig = {
      name: meme.name,
      symbol: meme.symbol,
      description: meme.description,
      imageUrl: meme.image_url,
      twitter: meme.twitter,
      telegram: meme.telegram,
      discord: meme.discord,
      website: meme.website,
      totalBackingSol: meme.current_backing_sol,
      creatorWallet: meme.creator_wallet,
    };

    // Launch on pump.fun
    const result = await launchToken(config);

    if (!result.success) {
      // Revert status on failure
      await supabase
        .from('memes')
        .update({ status: 'funded' })
        .eq('id', meme_id);

      return NextResponse.json(
        { error: result.error || 'Launch failed' },
        { status: 500 }
      );
    }

    // Update meme with launch info
    await supabase
      .from('memes')
      .update({
        status: 'live',
        mint_address: result.mintAddress,
        pump_fun_url: result.pumpFunUrl,
        launched_at: new Date().toISOString(),
      })
      .eq('id', meme_id);

    // Update creator's successful launches count
    await supabase.rpc('increment_successful_launches', {
      wallet: meme.creator_wallet,
    });

    // Get all backers for this meme to distribute tokens
    const { data: backings, error: backingsError } = await supabase
      .from('backings')
      .select('backer_wallet, amount_sol')
      .eq('meme_id', meme_id)
      .eq('status', 'confirmed');

    let distributionResult = null;

    if (!backingsError && backings && backings.length > 0 && result.mintAddress) {
      console.log(`Distributing tokens to ${backings.length} backers...`);

      // Map backings to BackerInfo format
      const backerInfos: BackerInfo[] = backings.map((b) => ({
        wallet: b.backer_wallet,
        amountSol: Number(b.amount_sol),
      }));

      // Distribute tokens proportionally
      distributionResult = await distributeTokensToBackers(
        result.mintAddress,
        backerInfos,
        Number(meme.current_backing_sol)
      );

      // Update backing records with distribution info
      if (distributionResult.success) {
        for (const distResult of distributionResult.results) {
          if (distResult.signature) {
            await supabase
              .from('backings')
              .update({
                status: 'distributed',
                tokens_received: distResult.tokensTransferred,
                distribution_tx: distResult.signature,
              })
              .eq('meme_id', meme_id)
              .eq('backer_wallet', distResult.wallet);
          }
        }
      }

      console.log('Token distribution complete:', distributionResult);
    }

    return NextResponse.json({
      success: true,
      mint_address: result.mintAddress,
      pump_fun_url: result.pumpFunUrl,
      signature: result.signature,
      distribution: distributionResult,
    });
  } catch (error) {
    console.error('Launch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
