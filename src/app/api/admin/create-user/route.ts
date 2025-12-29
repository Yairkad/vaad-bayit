import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: Request) {
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

    // Get request body
    const body = await request.json();
    const { email, full_name, phone, phone2, building_id, apartment_number, role = 'committee' } = body;

    if (!email || !full_name || !building_id || !apartment_number) {
      return NextResponse.json(
        { error: 'Missing required fields: email, full_name, building_id, apartment_number' },
        { status: 400 }
      );
    }

    // Check if user with this email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // User exists - just add them to the building
      userId = existingUser.id;

      // Check if already a member of this building
      const { data: existingMember } = await supabaseAdmin
        .from('building_members')
        .select('id')
        .eq('building_id', building_id)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this building' },
          { status: 400 }
        );
      }
    } else {
      // Invite new user - they will receive an email to set their password
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email,
        {
          data: {
            full_name,
          },
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/he/login`,
        }
      );

      if (inviteError || !inviteData.user) {
        console.error('Error inviting user:', inviteError);
        return NextResponse.json(
          { error: inviteError?.message || 'Failed to invite user' },
          { status: 500 }
        );
      }

      userId = inviteData.user.id;

      // Create profile for the new user with the appropriate system role
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          full_name,
          phone: phone || null,
          role: role === 'committee' ? 'committee' : 'tenant', // System role based on building role
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Don't fail - profile might be created by trigger
      }
    }

    // Add user as building member
    const { error: memberError } = await supabaseAdmin
      .from('building_members')
      .insert({
        building_id,
        user_id: userId,
        full_name,
        apartment_number,
        role, // committee or tenant
        phone: phone || null,
        phone2: phone2 || null,
      });

    if (memberError) {
      console.error('Error adding building member:', memberError);
      return NextResponse.json(
        { error: 'User created but failed to add to building: ' + memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      isNewUser: !existingUser,
      message: existingUser
        ? 'Existing user added to building'
        : 'New user created and added to building. Password reset email sent.',
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
