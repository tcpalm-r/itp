import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies, canEditAssessment } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { SaveDraftRequest } from '@/types';

// POST /api/itp/assessments/[id]/save-draft
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body: SaveDraftRequest = await request.json();

  // Fetch assessment to verify it exists and is a draft
  const { data: assessment, error: fetchError } = await getSupabaseAdmin()
    .from('itp_assessments')
    .select('employee_id, status')
    .eq('id', id)
    .single();

  if (fetchError || !assessment) {
    return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
  }

  if (assessment.status !== 'draft') {
    return NextResponse.json({ error: 'Can only save to draft assessments' }, { status: 400 });
  }

  // Check permission
  if (!canEditAssessment(user, assessment.employee_id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Upsert responses (includes user_email for audit trail)
  const responsesToUpsert = body.responses.map((r) => ({
    assessment_id: id,
    behavior_key: r.behaviorKey,
    rating: r.rating,
    user_email: user.email,
    updated_at: new Date().toISOString(),
  }));

  const { error: upsertError } = await getSupabaseAdmin()
    .from('itp_responses')
    .upsert(responsesToUpsert, {
      onConflict: 'assessment_id,behavior_key',
    });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  // Update assessment's updated_at
  await getSupabaseAdmin()
    .from('itp_assessments')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ success: true });
}
