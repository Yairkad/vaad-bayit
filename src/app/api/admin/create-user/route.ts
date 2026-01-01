import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Helper function to create admin client
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    console.error('Missing Supabase environment variables:', { url: !!url, serviceKey: !!serviceKey });
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    // Verify environment variables
    let supabaseAdmin;
    try {
      supabaseAdmin = getSupabaseAdmin();
    } catch {
      return NextResponse.json(
        { error: 'שגיאת הגדרות שרת - חסרים פרטי התחברות לסופהבייס' },
        { status: 500 }
      );
    }

    // Verify the requester is an admin
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'שגיאת אימות: ' + authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'לא מחובר - נא להתחבר מחדש' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'שגיאה בשליפת פרופיל: ' + profileError.message }, { status: 500 });
    }

    const profileData = profile as { role: string } | null;
    if (profileData?.role !== 'admin') {
      return NextResponse.json({ error: 'אין הרשאות מנהל' }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { email, full_name, phone, phone2, building_id, apartment_number, role = 'committee' } = body;

    if (!email || !full_name || !building_id) {
      return NextResponse.json(
        { error: 'חסרים שדות חובה: אימייל, שם מלא, מזהה בניין' },
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
          { error: 'המשתמש כבר חבר בבניין זה' },
          { status: 400 }
        );
      }
    } else {
      // Create new user with a temporary password (they will reset it)
      const tempPassword = crypto.randomUUID() + 'Aa1!'; // Strong temp password

      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name,
        },
      });

      if (createError || !createData.user) {
        console.error('Error creating user:', createError);
        return NextResponse.json(
          { error: 'שגיאה ביצירת משתמש: ' + (createError?.message || 'Unknown error') },
          { status: 500 }
        );
      }

      userId = createData.user.id;

      // Create profile manually (don't rely on trigger)
      const { error: profileCreateError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: userId,
          full_name,
          phone: phone || null,
          role: role === 'committee' ? 'committee' : 'tenant',
        }, { onConflict: 'id' });

      if (profileCreateError) {
        console.error('Error creating profile:', profileCreateError);
        // Try to delete the user if profile creation failed
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: 'שגיאה ביצירת פרופיל: ' + profileCreateError.message },
          { status: 500 }
        );
      }

      // Send password reset email so user can set their own password
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback?type=recovery`,
        },
      });

      if (resetError) {
        console.error('Error sending reset email:', resetError);
        // Don't fail - user was created, they can use "forgot password"
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
        { error: 'המשתמש נוצר אך לא הצלחנו להוסיף לבניין: ' + memberError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      userId,
      isNewUser: !existingUser,
      message: existingUser
        ? 'משתמש קיים נוסף לבניין'
        : 'משתמש חדש נוצר והוסף לבניין',
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'שגיאת שרת פנימית: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}
