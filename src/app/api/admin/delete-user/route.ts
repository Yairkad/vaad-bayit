import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function DELETE(request: Request) {
  try {
    // Verify the requester is an admin
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const profileData = profile as { role: string } | null;
    if (profileData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    // Get user ID to delete from query params
    const { searchParams } = new URL(request.url);
    const userIdToDelete = searchParams.get('userId');

    if (!userIdToDelete) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Prevent deleting yourself
    if (userIdToDelete === user.id) {
      return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 });
    }

    // Get admin client
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseAdmin();
    } catch (configError) {
      console.error('Supabase admin config error:', configError);
      return NextResponse.json(
        { error: 'Server configuration error - missing service role key' },
        { status: 500 }
      );
    }

    // Get user email first for pending_invites cleanup
    const { data: userToDelete } = await supabaseAdmin.auth.admin.getUserById(userIdToDelete);
    const userEmail = userToDelete.user?.email || '';

    // Get all building_members IDs for this user (for message_responses cleanup)
    const { data: memberRecords } = await supabaseAdmin
      .from('building_members')
      .select('id')
      .eq('user_id', userIdToDelete);

    // Delete message responses for all member records
    if (memberRecords && memberRecords.length > 0) {
      const memberIds = memberRecords.map(m => m.id);
      const { error: responsesError } = await supabaseAdmin
        .from('message_responses')
        .delete()
        .in('member_id', memberIds);
      if (responsesError) console.log('Note: message_responses deletion:', responsesError.message);
    }

    // Delete pending invites by email
    if (userEmail) {
      const { error: pendingError } = await supabaseAdmin
        .from('pending_invites')
        .delete()
        .eq('user_email', userEmail);
      if (pendingError) console.log('Note: pending_invites deletion:', pendingError.message);
    }

    // Clear foreign key references in tables that reference profiles
    // These don't have ON DELETE CASCADE, so we need to nullify them
    await supabaseAdmin
      .from('buildings')
      .update({ created_by: null })
      .eq('created_by', userIdToDelete);

    await supabaseAdmin
      .from('expenses')
      .update({ created_by: null })
      .eq('created_by', userIdToDelete);

    await supabaseAdmin
      .from('messages')
      .update({ created_by: null })
      .eq('created_by', userIdToDelete);

    await supabaseAdmin
      .from('documents')
      .update({ uploaded_by: null })
      .eq('uploaded_by', userIdToDelete);

    await supabaseAdmin
      .from('building_invites')
      .update({ created_by: null })
      .eq('created_by', userIdToDelete);

    // Delete building memberships
    const { error: membersError } = await supabaseAdmin
      .from('building_members')
      .delete()
      .eq('user_id', userIdToDelete);
    if (membersError) {
      console.error('Error deleting building_members:', membersError);
    }

    // Delete profile - this should now work since all FK references are cleared
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userIdToDelete);
    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to delete profile: ' + profileError.message },
        { status: 500 }
      );
    }

    // Delete auth user - profile has CASCADE on auth.users, but we already deleted it
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userIdToDelete);

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user: ' + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });

  } catch (error) {
    console.error('API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error: ' + message },
      { status: 500 }
    );
  }
}
