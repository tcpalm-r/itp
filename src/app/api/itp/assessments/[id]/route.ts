import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies, canViewAssessment, canEditAssessment } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// GET /api/itp/assessments/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch assessment with responses
  const { data: assessment, error } = await getSupabaseAdmin()
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
    .eq('id', id)
    .single();

  if (error || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  // Get employee profile for authorization check
  const { data: employeeProfile } = await getSupabaseAdmin()
    .from('user_profiles')
    .select('id, manager_id, manager_email')
    .eq('id', assessment.employee_id)
    .single();

  if (!employeeProfile || !canViewAssessment(user, assessment.employee_id, employeeProfile.manager_id, employeeProfile.manager_email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Transform responses
  const transformedAssessment = {
    ...assessment,
    responses: assessment.itp_responses,
    itp_responses: undefined,
  };

  return NextResponse.json({ assessment: transformedAssessment });
}

// DELETE /api/itp/assessments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch assessment to check ownership
  const { data: assessment, error: fetchError } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select('employee_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  // Only drafts can be deleted
  if (assessment.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft assessments can be deleted' }, { status: 400 });
  }

  // Check permission
  if (!canEditAssessment(user, assessment.employee_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete assessment (responses cascade)
  const { error: deleteError } = await getSupabaseAdmin()
    .from('itp_assessments')
    .delete()
    .eq('id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
