import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// POST /api/itp/assessments/[id]/reset
// Admin-only endpoint to reset a submitted assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can reset submitted assessments
  if (user.app_role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can reset submitted assessments' }, { status: 403 });
  }

  const { id } = await params;

  // Fetch assessment to verify it exists and check status
  const { data: assessment, error: fetchError } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select('id, employee_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  // Only submitted assessments can be reset
  if (assessment.status !== 'submitted') {
    return NextResponse.json({ error: 'Only submitted assessments can be reset' }, { status: 400 });
  }

  // Admins can only reset their own assessments
  if (assessment.employee_id !== user.id) {
    return NextResponse.json({ error: 'Admins can only reset their own assessments' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  // Delete all responses for this assessment
  const { error: deleteResponsesError } = await supabase
    .from('itp_responses')
    .delete()
    .eq('assessment_id', id);

  if (deleteResponsesError) {
    return NextResponse.json({ error: 'Failed to clear responses' }, { status: 500 });
  }

  // Delete the assessment itself
  const { error: deleteAssessmentError } = await supabase
    .from('itp_assessments')
    .delete()
    .eq('id', id);

  if (deleteAssessmentError) {
    return NextResponse.json({ error: 'Failed to delete assessment' }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: 'Assessment reset successfully' });
}
