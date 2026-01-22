import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies, canViewAssessment, canEditAssessment, isManagerOf } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ITPAssessmentType } from '@/types';

// GET /api/itp/assessments?employee_id=<uuid>&assessment_type=<self|manager>&assessor_id=<uuid>
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employee_id') || user.id;
  const assessmentType = (searchParams.get('assessment_type') as ITPAssessmentType) || 'self';
  const assessorId = searchParams.get('assessor_id') || user.id;

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

  // Build query
  let query = getSupabaseAdmin()
    .from('itp_assessments')
    .select(`
      id,
      employee_id,
      assessor_id,
      assessment_type,
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
    .eq('assessment_type', assessmentType);

  // For manager assessments, also filter by assessor
  if (assessmentType === 'manager') {
    query = query.eq('assessor_id', assessorId);
  }

  const { data: assessments, error } = await query.order('created_at', { ascending: false });

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
  const assessmentType: ITPAssessmentType = body.assessment_type || 'self';

  // Authorization check
  if (assessmentType === 'self') {
    // Self-assessment: user must be the employee (or admin)
    if (!canEditAssessment(user, employeeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else if (assessmentType === 'manager') {
    // Manager assessment: verify user is the manager of this employee
    const isUserManager = await isManagerOf(user.id, user.email, employeeId);
    if (!isUserManager && user.app_role !== 'admin') {
      return NextResponse.json({ error: 'You are not the manager of this employee' }, { status: 403 });
    }
  }

  // Check if there's already a draft assessment for this employee-assessor-type combo
  const { data: existingDraft } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('assessor_id', user.id)
    .eq('assessment_type', assessmentType)
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
      assessor_id: user.id,
      assessment_type: assessmentType,
      status: 'draft',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ assessment }, { status: 201 });
}
