import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth';
import { ITPSelfAssessment } from '@/components/ITPSelfAssessment';
import { ITPLogo } from '@/components/ITPLogo';
import { LogOut } from 'lucide-react';

export default async function HomePage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-sonance-charcoal text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/90 backdrop-blur-sm">
              <ITPLogo size={32} />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">ITP Self-Assessment</h1>
              <p className="text-sm text-white/70">{user.full_name || user.email}</p>
            </div>
          </div>
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ITPSelfAssessment
          employeeId={user.id}
          employeeName={user.full_name || undefined}
          currentUserId={user.id}
          isViewOnly={false}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <p className="text-center text-xs text-muted-foreground">
            Powered by Sonance
          </p>
        </div>
      </footer>
    </div>
  );
}
