'use client';

import { useState } from 'react';
import { ITPAssessment } from '@/types';
import { getBehaviorByKey, VIRTUE_CONFIG } from '@/lib/itpBehaviors';
import { ChevronDown, ChevronRight, Calendar, BarChart3 } from 'lucide-react';

interface ITPAssessmentHistoryProps {
  assessments: ITPAssessment[];
}

export default function ITPAssessmentHistory({
  assessments,
}: ITPAssessmentHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const archivedAssessments = assessments.filter((a) => a.status === 'archived');

  if (archivedAssessments.length === 0) {
    return null;
  }

  const calculateAverage = (assessment: ITPAssessment): number => {
    if (!assessment.responses || assessment.responses.length === 0) return 0;
    const sum = assessment.responses.reduce((acc, r) => acc + r.rating, 0);
    return sum / assessment.responses.length;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Assessment History
      </h3>

      <div className="space-y-2">
        {archivedAssessments.map((assessment) => (
          <div
            key={assessment.id}
            className="border border-gray-200 rounded-lg bg-white overflow-hidden"
          >
            <button
              onClick={() =>
                setExpandedId(expandedId === assessment.id ? null : assessment.id)
              }
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                {expandedId === assessment.id ? (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(assessment.submitted_at || assessment.created_at)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">
                  Avg: {calculateAverage(assessment).toFixed(1)}
                </span>
              </div>
            </button>

            {expandedId === assessment.id && assessment.responses && (
              <div className="border-t border-gray-200 p-4 bg-gray-50">
                <div className="grid gap-4">
                  {(['humble', 'hungry', 'people_smart'] as const).map((virtue) => {
                    const config = VIRTUE_CONFIG[virtue];
                    const virtueResponses = assessment.responses!.filter((r) => {
                      const behavior = getBehaviorByKey(r.behavior_key);
                      return behavior?.virtue === virtue;
                    });

                    if (virtueResponses.length === 0) return null;

                    return (
                      <div key={virtue}>
                        <h4 className={`font-medium ${config.color} mb-2`}>
                          {config.displayName}
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {virtueResponses.map((response) => {
                            const behavior = getBehaviorByKey(response.behavior_key);
                            return (
                              <div
                                key={response.behavior_key}
                                className="flex justify-between items-center text-sm bg-white p-2 rounded"
                              >
                                <span className="text-gray-700">
                                  {behavior?.behaviorName || response.behavior_key}
                                </span>
                                <span className="font-medium text-gray-900">
                                  {response.rating}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
