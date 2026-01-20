'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Loader2, AlertCircle } from 'lucide-react';
import { ITPLogo } from '@/components/ITPLogo';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.toLowerCase() }),
    });

    if (!response.ok) {
      setError('Email not found. Please try again or contact your administrator.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50 via-white to-neutral-100" />
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23333F48' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      {/* Cyan accent glow */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-sonance-cyan/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-sonance-cyan/3 rounded-full blur-3xl" />

      <div className="max-w-md w-full relative z-10 animate-slide-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white mb-6 shadow-lg border border-neutral-200/60">
            <ITPLogo size={56} />
          </div>
          <h1 className="text-3xl font-semibold text-sonance-charcoal tracking-tight">
            Ideal Team Player Self-Assessment
          </h1>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-lg border border-neutral-200/60 p-8">
          <h2 className="text-lg font-medium text-sonance-charcoal mb-6 text-center">
            Sign in to continue
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-sonance-charcoal mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-neutral-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="block w-full pl-11 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sonance-charcoal placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-sonance-cyan focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 text-red-700 bg-red-50 p-3.5 rounded-lg border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-medium text-white bg-sonance-charcoal hover:bg-sonance-charcoal-light focus:outline-none focus:ring-2 focus:ring-sonance-cyan focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          Powered by Sonance
        </p>
      </div>
    </div>
  );
}
