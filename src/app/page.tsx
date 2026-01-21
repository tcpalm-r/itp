import { redirect } from 'next/navigation';
import { getAuthenticatedUserFromCookies } from '@/lib/auth-server';
import { ITPSelfAssessment } from '@/components/ITPSelfAssessment';
import { ITPLogo } from '@/components/ITPLogo';
import { SignOutButton } from '@/components/SignOutButton';

export default async function HomePage() {
  const user = await getAuthenticatedUserFromCookies();

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
            <span className="text-base font-medium">{user.full_name || user.email}</span>
          </div>
          <SignOutButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ITPSelfAssessment
          employeeId={user.id}
          employeeName={user.full_name || undefined}
          currentUserId={user.id}
          isViewOnly={false}
          isAdmin={user.app_role === 'admin'}
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
