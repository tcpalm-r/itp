'use client';

import React, { useState } from 'react';
import { ITPAssessment, ITPVirtue } from '@/types';
import { getBehaviorsByVirtue, VIRTUE_CONFIG, RATING_LABELS } from '@/lib/itpBehaviors';
import { Calendar, ChevronDown, ChevronUp } from 'lucide-react';

interface ITPAssessmentHistoryProps {
  assessments: ITPAssessment[];
}

function ExpandedAssessmentView({ assessment }: { assessment: ITPAssessment }) {
  const behaviorsByVirtue = getBehaviorsByVirtue();

  const responseMap: Record<string, number> = {};
  assessment.responses?.forEach((r: any) => {
    responseMap[r.behaviorKey || r.behavior_key] = r.rating;
  });

  const virtueAverages: Record<ITPVirtue, number> = {
    humble: 0,
    hungry: 0,
    people_smart: 0,
  };

  (['humble', 'hungry', 'people_smart'] as ITPVirtue[]).forEach((virtue) => {
    const behaviors = behaviorsByVirtue[virtue];
    const ratings = behaviors.map(b => responseMap[b.behaviorKey]).filter(r => r !== undefined);
    if (ratings.length > 0) {
      virtueAverages[virtue] = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    }
  });

  const getRatingColor = (rating: number): string => {
    if (rating <= 2) return 'bg-red-50 text-red-700 border-red-200';
    if (rating === 3) return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  };

  return (
    <div className="mt-4 space-y-5">
      {/* Virtue Averages */}
      <div className="grid grid-cols-3 gap-3">
        {(['humble', 'hungry', 'people_smart'] as ITPVirtue[]).map((virtue) => {
          const config = VIRTUE_CONFIG[virtue];
          const avg = virtueAverages[virtue];
          return (
            <div key={virtue} className={`p-4 rounded-xl border ${config.borderColor} ${config.bgColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: config.accentColor }}
                />
                <div className={`font-medium ${config.color} text-sm`}>{config.displayName}</div>
              </div>
              <div className={`text-2xl font-semibold ${config.color}`}>{avg > 0 ? avg.toFixed(1) : '-'}</div>
              <div className="text-xs text-muted-foreground">avg rating</div>
            </div>
          );
        })}
      </div>

      {/* Detailed Ratings */}
      {(['humble', 'hungry', 'people_smart'] as ITPVirtue[]).map((virtue) => {
        const config = VIRTUE_CONFIG[virtue];
        const behaviors = behaviorsByVirtue[virtue];
        return (
          <div key={virtue} className="space-y-2">
            <h5 className={`font-medium ${config.color} text-sm flex items-center gap-2`}>
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: config.accentColor }}
              />
              {config.displayName}
            </h5>
            <div className="space-y-1.5">
              {behaviors.map((behavior) => {
                const rating = responseMap[behavior.behaviorKey];
                return (
                  <div key={behavior.behaviorKey} className="flex items-center justify-between py-2 px-3 bg-white rounded-lg border border-neutral-100">
                    <span className="text-sm text-sonance-charcoal">{behavior.behaviorName}</span>
                    {rating !== undefined ? (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getRatingColor(rating)}`}>
                        {rating} - {RATING_LABELS[rating] || 'In Progress'}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Not rated</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ITPAssessmentHistory({ assessments }: ITPAssessmentHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (assessments.length === 0) return null;

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getOverallAverage = (assessment: ITPAssessment): number => {
    const ratings = assessment.responses?.map((r: any) => r.rating) || [];
    if (ratings.length === 0) return 0;
    return ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
  };

  return (
    <div className="mt-6 space-y-3">
      {assessments.map((assessment) => {
        const isExpanded = expandedId === assessment.id;
        const avg = getOverallAverage(assessment);
        const ratedCount = assessment.responses?.length || 0;

        return (
          <div key={assessment.id} className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              onClick={() => setExpandedId(isExpanded ? null : assessment.id)}
              className="w-full px-5 py-4 bg-neutral-50 hover:bg-neutral-100 transition-all duration-200 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sonance-charcoal/5 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-sonance-charcoal" />
                </div>
                <div>
                  <div className="font-medium text-sonance-charcoal">
                    {assessment.submitted_at ? formatDate(assessment.submitted_at) : formatDate(assessment.created_at)}
                  </div>
                  <div className="text-xs text-muted-foreground">{ratedCount} behaviors rated</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-semibold text-sonance-charcoal">{avg > 0 ? avg.toFixed(1) : '-'}</div>
                  <div className="text-xs text-muted-foreground">overall avg</div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200 flex items-center justify-center">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-sonance-charcoal" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-sonance-charcoal" />
                  )}
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-5 pb-5 bg-white">
                <ExpandedAssessmentView assessment={assessment} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ITPAssessmentHistory;
