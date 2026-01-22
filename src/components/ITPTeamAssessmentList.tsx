'use client';

import { DirectReport } from '@/types';
import { User, CheckCircle, Clock, Plus } from 'lucide-react';

interface ITPTeamAssessmentListProps {
  directReports: DirectReport[];
  onSelectEmployee: (employeeId: string) => void;
  loading?: boolean;
}

export function ITPTeamAssessmentList({
  directReports,
  onSelectEmployee,
  loading = false,
}: ITPTeamAssessmentListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse">
          <div className="h-4 bg-neutral-200 rounded w-48 mx-auto mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-neutral-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (directReports.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
          <User className="w-8 h-8 text-neutral-400" />
        </div>
        <p className="text-muted-foreground">No direct reports found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-sonance-charcoal">
          Your Direct Reports
        </h3>
        <span className="text-sm text-muted-foreground">
          {directReports.length} {directReports.length === 1 ? 'person' : 'people'}
        </span>
      </div>

      {directReports.map((report) => (
        <button
          key={report.id}
          onClick={() => onSelectEmployee(report.id)}
          className="w-full flex items-center justify-between p-4 rounded-lg border border-neutral-200 hover:border-neutral-300 bg-white hover:bg-neutral-50 transition-all duration-200"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-neutral-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-sonance-charcoal">
                {report.full_name || report.email}
              </p>
              {report.title && (
                <p className="text-sm text-muted-foreground">{report.title}</p>
              )}
            </div>
          </div>
          <StatusBadge status={report.managerAssessmentStatus} />
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: 'none' | 'draft' | 'submitted' }) {
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle className="w-3.5 h-3.5 mr-1" />
        Completed
      </span>
    );
  }
  if (status === 'draft') {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
        <Clock className="w-3.5 h-3.5 mr-1" />
        In Progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
      <Plus className="w-3.5 h-3.5 mr-1" />
      Not Started
    </span>
  );
}
