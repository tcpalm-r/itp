import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies, canEditAssessment } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { getAllBehaviorKeys } from '@/lib/itpBehaviors';

// POST /api/itp/assessments/[id]/submit
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Fetch assessment with responses
  const { data: assessment, error: fetchError } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select(`
      employee_id,
      status,
      itp_responses (
        behavior_key
      )
    `)
    .eq('id', id)
    .single();

  if (fetchError || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  if (assessment.status !== 'draft') {
    return NextResponse.json({ error: 'Assessment is not a draft' }, { status: 400 });
  }

  // Check permission
  if (!canEditAssessment(user, assessment.employee_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate all 12 behaviors are rated
  const allBehaviorKeys = getAllBehaviorKeys();
  const ratedBehaviors = new Set(assessment.itp_responses?.map((r) => r.behavior_key) || []);
  const missingBehaviors = allBehaviorKeys.filter((key) => !ratedBehaviors.has(key));

  // Log for debugging
  console.log(`[submit] User: ${user.email} (${user.id}), Assessment: ${id}`);
  console.log(`[submit] Rated behaviors in DB: ${Array.from(ratedBehaviors).join(', ')}`);
  console.log(`[submit] Missing behaviors: ${missingBehaviors.length > 0 ? missingBehaviors.join(', ') : 'none'}`);

  if (missingBehaviors.length > 0) {
    console.error(`[submit] REJECTED - Missing: ${missingBehaviors.join(', ')}`);
    return NextResponse.json(
      { error: 'All behaviors must be rated', missingBehaviors },
      { status: 400 }
    );
  }

  // Archive any previously submitted assessment
  await getSupabaseAdmin()
    .from('itp_assessments')
    .update({ status: 'archived' })
    .eq('employee_id', assessment.employee_id)
    .eq('status', 'submitted');

  // Submit the current assessment
  const { data: submittedAssessment, error: submitError } = await getSupabaseAdmin()
    .from('itp_assessments')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (submitError) {
    return NextResponse.json({ error: submitError.message }, { status: 500 });
  }

  return NextResponse.json({ assessment: submittedAssessment });
}
