'use client';

import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SignOutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignOut() {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        redirect: 'manual',
      });

      // If we got a redirect (production), follow it
      if (response.type === 'opaqueredirect' || response.redirected) {
        window.location.href = response.url || '/';
        return;
      }

      // Navigate to home - middleware will handle auth redirect
      window.location.href = '/';
    } catch (error) {
      console.error('Sign out failed:', error);
      window.location.href = '/';
    }
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      {isLoading ? 'Signing out...' : 'Sign out'}
    </button>
  );
}
