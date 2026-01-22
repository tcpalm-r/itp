'use client';

interface ITPTabNavProps {
  activeTab: 'self' | 'team';
  onTabChange: (tab: 'self' | 'team') => void;
}

export function ITPTabNav({ activeTab, onTabChange }: ITPTabNavProps) {
  return (
    <div className="flex border-b border-neutral-200 mb-6">
      <button
        onClick={() => onTabChange('self')}
        className={`px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'self'
            ? 'text-sonance-cyan border-b-2 border-sonance-cyan'
            : 'text-muted-foreground hover:text-sonance-charcoal'
        }`}
      >
        Self-Assessment
      </button>
      <button
        onClick={() => onTabChange('team')}
        className={`px-6 py-3 text-sm font-medium transition-colors ${
          activeTab === 'team'
            ? 'text-sonance-cyan border-b-2 border-sonance-cyan'
            : 'text-muted-foreground hover:text-sonance-charcoal'
        }`}
      >
        Assess Your Team
      </button>
    </div>
  );
}
