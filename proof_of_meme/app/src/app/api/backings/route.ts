import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { verifyDeposit, getEscrowAddress, launchToken } from '@/services/pumpfun';
import { rateLimiters } from '@/lib/rateLimit';

// GET /api/backings - Get backings for a user or meme
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const memeId = searchParams.get('meme_id');
    const backer = searchParams.get('backer');

    let query = supabase
      .from('backings')
      .select('*, memes(id, name, symbol, image_url, status, backing_goal_sol, current_backing_sol, backing_deadline, mint_address, pump_fun_url, trust_score)')
      .order('created_at', { ascending: false });

    if (memeId) {
      query = query.eq('meme_id', memeId);
    }

    if (backer) {
      query = query.eq('backer_wallet', backer);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ backings: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/backings - Create a new backing
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { meme_id, backer_wallet, amount_sol, deposit_tx } = body;

    // Validation
    if (!meme_id || !backer_wallet || !amount_sol || !deposit_tx) {
      return NextResponse.json(
        { error: 'Missing required fields: meme_id, backer_wallet, amount_sol, deposit_tx' },
        { status: 400 }
      );
    }

    // Rate limiting - 5 backing requests per minute per wallet
    const rateLimitResult = rateLimiters.backing(backer_wallet);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before backing again.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitResult.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetTime),
          }
        }
      );
    }

    if (amount_sol < 0.01) {
      return NextResponse.json(
        { error: 'Minimum backing is 0.01 SOL' },
        { status: 400 }
      );
    }

    // Check if meme exists and is in backing phase
    const { data: meme, error: memeError } = await supabase
      .from('memes')
      .select('*')
      .eq('id', meme_id)
      .single();

    if (memeError || !meme) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    if (meme.status !== 'backing') {
      return NextResponse.json(
        { error: `Meme is not accepting backings (status: ${meme.status})` },
        { status: 400 }
      );
    }

    // Check if deadline passed
    if (new Date(meme.backing_deadline) < new Date()) {
      return NextResponse.json(
        { error: 'Backing period has ended' },
        { status: 400 }
      );
    }

    // Check max backing per wallet (10% of goal)
    const maxBackingPerWallet = Number(meme.backing_goal_sol) * 0.1;

    // Get existing backing for this wallet
    const { data: existingBacking } = await supabase
      .from('backings')
      .select('amount_sol')
      .eq('meme_id', meme_id)
      .eq('backer_wallet', backer_wallet)
      .neq('status', 'withdrawn')
      .single();

    const existingAmount = existingBacking ? Number(existingBacking.amount_sol) : 0;
    const totalAfterBacking = existingAmount + amount_sol;

    if (totalAfterBacking > maxBackingPerWallet) {
      const remainingAllowance = Math.max(0, maxBackingPerWallet - existingAmount);
      return NextResponse.json(
        {
          error: `Maximum backing per wallet is ${maxBackingPerWallet.toFixed(2)} SOL (10% of goal). You can back up to ${remainingAllowance.toFixed(2)} more SOL.`,
        },
        { status: 400 }
      );
    }

    // Verify the deposit transaction on-chain
    // This ensures the user actually sent SOL to the escrow wallet
    const isValid = await verifyDeposit(deposit_tx, amount_sol, backer_wallet);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Could not verify deposit transaction. Please ensure the transaction is confirmed and try again.' },
        { status: 400 }
      );
    }

    // Ensure user exists
    await supabase
      .from('users')
      .upsert({ wallet_address: backer_wallet }, { onConflict: 'wallet_address' });

    // Create or update backing
    const { data, error } = await supabase
      .from('backings')
      .upsert(
        {
          meme_id,
          backer_wallet,
          amount_sol,
          deposit_tx,
          status: 'confirmed',
        },
        { onConflict: 'meme_id,backer_wallet' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Check if this backing pushed the meme over its goal
    // If so, trigger launch immediately (don't wait for cron)
    const { data: updatedMeme } = await supabase
      .from('memes')
      .select('*')
      .eq('id', meme_id)
      .single();

    if (updatedMeme) {
      const currentBacking = Number(updatedMeme.current_backing_sol);
      const goal = Number(updatedMeme.backing_goal_sol);

      if (currentBacking >= goal && updatedMeme.status === 'backing') {
        console.log(`Goal reached for ${updatedMeme.name}! Triggering launch...`);

        // Update status to launching
        await supabase
          .from('memes')
          .update({ status: 'launching' })
          .eq('id', meme_id);

        // Launch asynchronously (don't block the response)
        launchToken({
          name: updatedMeme.name,
          symbol: updatedMeme.symbol,
          description: updatedMeme.description,
          imageUrl: updatedMeme.image_url,
          twitter: updatedMeme.twitter,
          telegram: updatedMeme.telegram,
          discord: updatedMeme.discord,
          website: updatedMeme.website,
          totalBackingSol: currentBacking,
          creatorWallet: updatedMeme.creator_wallet,
        }).then(async (result) => {
          if (result.success) {
            await supabase
              .from('memes')
              .update({
                status: 'live',
                mint_address: result.mintAddress,
                pump_fun_url: result.pumpFunUrl,
                launched_at: new Date().toISOString(),
              })
              .eq('id', meme_id);
            console.log(`Launched ${updatedMeme.name}: ${result.pumpFunUrl}`);
          } else {
            // Revert to backing on failure
            await supabase
              .from('memes')
              .update({ status: 'backing' })
              .eq('id', meme_id);
            console.error(`Launch failed for ${updatedMeme.name}:`, result.error);
          }
        }).catch(async (err) => {
          await supabase
            .from('memes')
            .update({ status: 'backing' })
            .eq('id', meme_id);
          console.error(`Launch error for ${updatedMeme.name}:`, err);
        });

        return NextResponse.json({
          backing: data,
          goalReached: true,
          message: 'Goal reached! Launch initiated.',
        }, { status: 201 });
      }
    }

    return NextResponse.json({ backing: data }, { status: 201 });
  } catch (error) {
    console.error('Create backing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET escrow address (separate endpoint would be cleaner but keeping simple)
export async function OPTIONS() {
  return NextResponse.json({ escrow_address: getEscrowAddress() });
}
