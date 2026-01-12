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
    } = body;

    // Validation
    if (!creator_wallet || !name || !symbol || !description || !image_url) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
        submission_fee_paid: false, // TODO: Verify submission fee
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
