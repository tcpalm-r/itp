import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies, canViewAssessment, canEditAssessment } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/itp/assessments?employee_id=<uuid>
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employee_id') || user.id;

  // Get the target employee's profile to check authorization
  if (employeeId !== user.id) {
    const { data: targetProfile } = await getSupabaseAdmin()
      .from('user_profiles')
      .select('id, manager_id, manager_email')
      .eq('id', employeeId)
      .single();

    if (!targetProfile || !canViewAssessment(user, employeeId, targetProfile.manager_id, targetProfile.manager_email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Fetch assessments with responses
  const { data: assessments, error } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select(`
      id,
      employee_id,
      status,
      submitted_at,
      created_at,
      updated_at,
      itp_responses (
        id,
        behavior_key,
        rating,
        created_at,
        updated_at
      )
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Transform responses field name
  const transformedAssessments = assessments?.map(a => ({
    ...a,
    responses: a.itp_responses,
    itp_responses: undefined,
  }));

  return NextResponse.json({ assessments: transformedAssessments });
}

// POST /api/itp/assessments - Create new draft assessment
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const employeeId = body.employee_id || user.id;

  // Check if user can create assessment for this employee
  if (!canEditAssessment(user, employeeId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check if there's already a draft assessment
  const { data: existingDraft } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('status', 'draft')
    .single();

  if (existingDraft) {
    return NextResponse.json(
      { error: 'A draft assessment already exists', existingId: existingDraft.id },
      { status: 409 }
    );
  }

  // Create new draft assessment
  const { data: assessment, error } = await getSupabaseAdmin()
    .from('itp_assessments')
    .insert({
      employee_id: employeeId,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assessment }, { status: 201 });
}
