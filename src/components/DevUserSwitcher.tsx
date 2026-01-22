'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, User, Check, Loader2 } from 'lucide-react';

interface TestUser {
  id: string;
  email: string;
  full_name: string;
  app_role: string;
  department?: string | null;
  title?: string | null;
}

interface DevUserSwitcherProps {
  currentUserEmail: string;
}

const roleColors: Record<string, string> = {
  admin: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  slt: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  leader: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  user: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
};

export function DevUserSwitcher({ currentUserEmail }: DevUserSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if auth is disabled (dev mode)
  const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === 'true';

  // Fetch users when dropdown opens
  useEffect(() => {
    if (isOpen && users.length === 0 && !loading) {
      setLoading(true);
      fetch('/api/auth/switch-user')
        .then(res => res.json())
        .then(data => {
          setUsers(data.users || []);
        })
        .catch(err => {
          console.error('Failed to fetch test users:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, users.length, loading]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if auth is not disabled
  if (!authDisabled) return null;

  async function handleSwitchUser(email: string) {
    if (email === currentUserEmail) {
      setIsOpen(false);
      return;
    }

    setSwitching(true);
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const data = await res.json();
        console.error('Failed to switch user:', data.error);
        setSwitching(false);
      }
    } catch (error) {
      console.error('Error switching user:', error);
      setSwitching(false);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm text-white/80
                   hover:text-white hover:bg-white/10 rounded-lg transition-all
                   duration-200 disabled:opacity-50 border border-yellow-500/50
                   bg-yellow-500/10"
      >
        {switching ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <User className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Dev Switch</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-sonance-charcoal-dark
                        border border-white/20 rounded-lg shadow-xl z-50
                        overflow-hidden">
          <div className="px-3 py-2 border-b border-white/10">
            <span className="text-xs text-yellow-400 font-medium">
              DEV MODE - Switch User
            </span>
          </div>

          {loading ? (
            <div className="px-3 py-4 text-center text-white/60 text-sm">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="px-3 py-4 text-center text-white/60 text-sm">
              No test users found
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {users.map(user => {
                const isCurrent = user.email === currentUserEmail;
                const roleClass = roleColors[user.app_role] || roleColors.user;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSwitchUser(user.email)}
                    disabled={switching}
                    className={`w-full px-3 py-2.5 text-left hover:bg-white/10
                                transition-colors flex items-start gap-3
                                disabled:opacity-50
                                ${isCurrent ? 'bg-white/5' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-medium truncate">
                          {user.full_name}
                        </span>
                        {isCurrent && (
                          <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${roleClass}`}>
                          {user.app_role}
                        </span>
                        {user.title && (
                          <span className="text-xs text-white/40 truncate">
                            {user.title}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
