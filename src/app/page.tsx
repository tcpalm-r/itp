import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { ITPSelfAssessment } from '@/components/ITPSelfAssessment';
import { LogOut } from 'lucide-react';

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">ITP Self-Assessment</h1>
            <p className="text-sm text-gray-500">{user.full_name || user.email}</p>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <ITPSelfAssessment
          employeeId={user.id}
          employeeName={user.full_name || undefined}
          currentUserId={user.id}
          isViewOnly={false}
        />
      </main>
    </div>
  );
}
