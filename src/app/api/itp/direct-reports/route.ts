import { NextResponse } from 'next/server';
import { getAuthenticatedUserFromCookies } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { DirectReport } from '@/types';

// GET /api/itp/direct-reports
// Returns list of direct reports with their manager assessment status
export async function GET() {
  const user = await getAuthenticatedUserFromCookies();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // Fetch direct reports where manager_id = user.id OR manager_email = user.email
  const { data: directReports, error: reportsError } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, department, title')
    .or(`manager_id.eq.${user.id},manager_email.eq.${user.email}`)
    .order('full_name', { ascending: true });

  if (reportsError) {
    return NextResponse.json({ error: reportsError.message }, { status: 500 });
  }

  if (!directReports || directReports.length === 0) {
    return NextResponse.json({ directReports: [] });
  }

  // Get employee IDs for manager assessment lookup
  const employeeIds = directReports.map(dr => dr.id);

  // Fetch manager assessments by this manager for these employees
  const { data: managerAssessments, error: assessmentsError } = await supabase
    .from('itp_assessments')
    .select('employee_id, status')
    .in('employee_id', employeeIds)
    .eq('assessor_id', user.id)
    .eq('assessment_type', 'manager')
    .in('status', ['draft', 'submitted']);

  if (assessmentsError) {
    return NextResponse.json({ error: assessmentsError.message }, { status: 500 });
  }

  // Build a map of employee_id -> assessment status
  const assessmentStatusMap = new Map<string, 'draft' | 'submitted'>();
  for (const assessment of managerAssessments || []) {
    // Prefer 'submitted' over 'draft' if multiple exist
    const currentStatus = assessmentStatusMap.get(assessment.employee_id);
    if (!currentStatus || (currentStatus === 'draft' && assessment.status === 'submitted')) {
      assessmentStatusMap.set(assessment.employee_id, assessment.status as 'draft' | 'submitted');
    }
  }

  // Merge data
  const result: DirectReport[] = directReports.map(dr => ({
    id: dr.id,
    email: dr.email,
    full_name: dr.full_name,
    department: dr.department,
    title: dr.title,
    managerAssessmentStatus: assessmentStatusMap.get(dr.id) || 'none',
  }));

  return NextResponse.json({ directReports: result });
}
