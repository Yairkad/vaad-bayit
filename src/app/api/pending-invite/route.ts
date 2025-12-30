import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role to bypass RLS for pending invites
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_email, building_id, invite_id, apartment_number, full_name, phone, default_role } = body;

    // Validate required fields
    if (!user_email || !building_id || !invite_id || !apartment_number || !full_name) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify the invite exists and is valid
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('building_invites')
      .select('id, is_active, expires_at, max_uses, uses_count')
      .eq('id', invite_id)
      .eq('building_id', building_id)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid invite' },
        { status: 400 }
      );
    }

    // Check if invite is still valid
    if (!invite.is_active) {
      return NextResponse.json(
        { error: 'Invite is no longer active' },
        { status: 400 }
      );
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Invite has expired' },
        { status: 400 }
      );
    }

    if (invite.max_uses && invite.uses_count >= invite.max_uses) {
      return NextResponse.json(
        { error: 'Invite has reached maximum uses' },
        { status: 400 }
      );
    }

    // Upsert the pending invite using service role
    const { error: upsertError } = await supabaseAdmin
      .from('pending_invites')
      .upsert({
        user_email,
        building_id,
        invite_id,
        apartment_number,
        full_name,
        phone: phone || null,
        default_role: default_role || 'tenant',
      }, { onConflict: 'user_email' });

    if (upsertError) {
      console.error('Error creating pending invite:', upsertError);
      return NextResponse.json(
        { error: 'Failed to save pending invite' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Pending invite API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
