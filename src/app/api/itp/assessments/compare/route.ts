import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies, canViewAssessment, isManagerOf } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { ITP_BEHAVIORS } from '@/lib/itpBehaviors';
import { AssessmentComparison, BehaviorComparison, ITPAssessment } from '@/types';

const SIGNIFICANT_DIFFERENCE_THRESHOLD = 4;

// GET /api/itp/assessments/compare?employee_id=<uuid>&manager_id=<uuid>
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get('employee_id');
  const managerId = searchParams.get('manager_id');

  if (!employeeId || !managerId) {
    return NextResponse.json(
      { error: 'employee_id and manager_id are required' },
      { status: 400 }
    );
  }

  // Verify the user is the manager making this request
  const isUserManager = await isManagerOf(user.id, user.email, employeeId);
  if (user.id !== managerId || (!isUserManager && user.app_role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch manager's submitted assessment for this employee
  const { data: managerAssessmentData } = await supabase
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
    .eq('assessor_id', managerId)
    .eq('assessment_type', 'manager')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch employee's self-assessment (submitted)
  const { data: selfAssessmentData } = await supabase
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
    .eq('assessor_id', employeeId)
    .eq('assessment_type', 'self')
    .eq('status', 'submitted')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .single();

  // Transform to ITPAssessment format
  const transformAssessment = (data: any): ITPAssessment | null => {
    if (!data) return null;
    return {
      ...data,
      responses: data.itp_responses?.map((r: any) => ({
        id: r.id,
        behaviorKey: r.behavior_key,
        rating: r.rating,
        created_at: r.created_at,
        updated_at: r.updated_at,
      })),
    };
  };

  const managerAssessment = transformAssessment(managerAssessmentData);
  const selfAssessment = transformAssessment(selfAssessmentData);

  // Build response maps
  const managerResponses: Record<string, number> = {};
  const selfResponses: Record<string, number> = {};

  managerAssessment?.responses?.forEach((r) => {
    managerResponses[r.behaviorKey] = r.rating;
  });

  selfAssessment?.responses?.forEach((r) => {
    selfResponses[r.behaviorKey] = r.rating;
  });

  // Build behavior comparisons
  const behaviors: BehaviorComparison[] = ITP_BEHAVIORS.map((behavior) => {
    const managerRating = managerResponses[behavior.behaviorKey] ?? null;
    const selfRating = selfResponses[behavior.behaviorKey] ?? null;

    let difference: number | null = null;
    if (managerRating !== null && selfRating !== null) {
      difference = Math.abs(managerRating - selfRating);
    }

    return {
      behaviorKey: behavior.behaviorKey,
      behaviorName: behavior.behaviorName,
      virtue: behavior.virtue,
      managerRating,
      selfRating,
      difference,
      hasSignificantDifference: difference !== null && difference >= SIGNIFICANT_DIFFERENCE_THRESHOLD,
    };
  });

  const comparison: AssessmentComparison = {
    managerAssessment,
    selfAssessment,
    behaviors,
  };

  return NextResponse.json({ comparison });
}
