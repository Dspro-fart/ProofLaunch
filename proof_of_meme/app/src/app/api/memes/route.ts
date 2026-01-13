import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

// GET /api/memes - List all memes with optional filters
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const creator = searchParams.get('creator');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('memes_with_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (creator) {
      query = query.eq('creator_wallet', creator);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ memes: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Required creation fee in SOL
const CREATION_FEE_SOL = 0.01;

// POST /api/memes - Submit a new meme
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const {
      creator_wallet,
      name,
      symbol,
      description,
      image_url,
      twitter,
      telegram,
      discord,
      website,
      backing_goal_sol,
      backing_days,
      // Trust score parameters
      creator_fee_pct = 2,
      backer_share_pct = 70,
      dev_initial_buy_sol = 0,
      auto_refund = true,
      trust_score = 75,
      // Creation fee payment
      creation_fee_signature,
      creation_fee_sol,
    } = body;

    // Validation
    if (!creator_wallet || !name || !symbol || !description || !image_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Require creation fee payment
    if (!creation_fee_signature) {
      return NextResponse.json(
        { error: 'Creation fee payment required' },
        { status: 400 }
      );
    }

    if (!creation_fee_sol || creation_fee_sol < CREATION_FEE_SOL) {
      return NextResponse.json(
        { error: `Creation fee must be at least ${CREATION_FEE_SOL} SOL` },
        { status: 400 }
      );
    }

    if (!backing_goal_sol || backing_goal_sol < 1) {
      return NextResponse.json(
        { error: 'Backing goal must be at least 1 SOL' },
        { status: 400 }
      );
    }

    if (symbol.length > 10) {
      return NextResponse.json(
        { error: 'Symbol must be 10 characters or less' },
        { status: 400 }
      );
    }

    // Calculate deadline
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (backing_days || 7));

    // Ensure user exists
    const { error: userError } = await supabase
      .from('users')
      .upsert({ wallet_address: creator_wallet }, { onConflict: 'wallet_address' });

    if (userError) {
      console.error('User upsert error:', userError);
    }

    // Create meme
    const { data, error } = await supabase
      .from('memes')
      .insert({
        creator_wallet,
        name,
        symbol: symbol.toUpperCase(),
        description,
        image_url,
        twitter,
        telegram,
        discord,
        website,
        backing_goal_sol,
        backing_deadline: deadline.toISOString(),
        status: 'backing', // Start in backing phase
        submission_fee_paid: true, // Fee paid via creation_fee_signature
        current_backing_sol: creation_fee_sol, // Start with creation fee as initial backing
        // Trust score parameters
        creator_fee_pct,
        backer_share_pct,
        dev_initial_buy_sol,
        auto_refund,
        trust_score,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Record the creation fee as the creator's initial backing
    const { error: backingError } = await supabase
      .from('backings')
      .insert({
        meme_id: data.id,
        backer_wallet: creator_wallet,
        amount_sol: creation_fee_sol,
        transaction_signature: creation_fee_signature,
        status: 'confirmed',
      });

    if (backingError) {
      console.error('Failed to record creation fee as backing:', backingError);
    }

    // Update user's meme count
    await supabase.rpc('increment_memes_created', { wallet: creator_wallet });

    return NextResponse.json({ meme: data }, { status: 201 });
  } catch (error) {
    console.error('Create meme error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
