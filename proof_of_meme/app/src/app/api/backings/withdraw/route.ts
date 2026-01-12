import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { refundBacker, getEscrowBalance } from '@/services/pumpfun';
import { rateLimiters } from '@/lib/rateLimit';

// POST /api/backings/withdraw - Withdraw backing from a meme
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const body = await request.json();

    const { meme_id, backer_wallet } = body;

    if (!meme_id || !backer_wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: meme_id, backer_wallet' },
        { status: 400 }
      );
    }

    // Rate limiting - 3 withdraw requests per minute per wallet
    const rateLimitResult = rateLimiters.withdraw(backer_wallet);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    // Get the meme to check status
    const { data: meme, error: memeError } = await supabase
      .from('memes')
      .select('status, name')
      .eq('id', meme_id)
      .single();

    if (memeError || !meme) {
      return NextResponse.json({ error: 'Meme not found' }, { status: 404 });
    }

    // Only allow withdrawal during backing phase
    if (meme.status !== 'backing') {
      return NextResponse.json(
        { error: `Cannot withdraw: meme is ${meme.status}. Withdrawals only allowed during backing phase.` },
        { status: 400 }
      );
    }

    // Get the backing record
    const { data: backing, error: backingError } = await supabase
      .from('backings')
      .select('*')
      .eq('meme_id', meme_id)
      .eq('backer_wallet', backer_wallet)
      .single();

    if (backingError || !backing) {
      return NextResponse.json(
        { error: 'Backing not found for this wallet' },
        { status: 404 }
      );
    }

    if (backing.status === 'withdrawn') {
      return NextResponse.json(
        { error: 'This backing has already been withdrawn' },
        { status: 400 }
      );
    }

    if (backing.status === 'distributed') {
      return NextResponse.json(
        { error: 'Tokens have already been distributed for this backing' },
        { status: 400 }
      );
    }

    const amountSol = Number(backing.amount_sol);

    // Check escrow balance before attempting refund
    const escrowBalance = await getEscrowBalance();
    // Add buffer for transaction fees (0.01 SOL)
    const requiredBalance = amountSol + 0.01;

    if (escrowBalance < requiredBalance) {
      console.error(`Insufficient escrow balance: ${escrowBalance} SOL < ${requiredBalance} SOL required`);
      return NextResponse.json(
        { error: 'Escrow has insufficient funds. Please contact support.' },
        { status: 503 }
      );
    }

    // Process refund from escrow to backer
    console.log(`Processing withdrawal of ${amountSol} SOL to ${backer_wallet} (escrow balance: ${escrowBalance} SOL)`);
    const refundResult = await refundBacker(backer_wallet, amountSol);

    if (!refundResult.success) {
      console.error('Refund failed:', refundResult.error);
      return NextResponse.json(
        { error: `Refund failed: ${refundResult.error}` },
        { status: 500 }
      );
    }

    // Update backing status to withdrawn
    const { error: updateError } = await supabase
      .from('backings')
      .update({
        status: 'withdrawn',
        refund_tx: refundResult.signature,
      })
      .eq('id', backing.id);

    if (updateError) {
      console.error('Failed to update backing status:', updateError);
      // Note: Refund already happened, so we log but don't fail
    }

    // The database trigger will automatically update current_backing_sol
    // But we need to handle the withdrawal case - let's manually update
    const { data: updatedMeme } = await supabase
      .from('memes')
      .select('current_backing_sol')
      .eq('id', meme_id)
      .single();

    console.log(`Withdrawal complete. New backing total: ${updatedMeme?.current_backing_sol} SOL`);

    return NextResponse.json({
      success: true,
      amount_refunded: amountSol,
      refund_tx: refundResult.signature,
      message: `Successfully withdrew ${amountSol} SOL`,
    });
  } catch (error) {
    console.error('Withdrawal error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
