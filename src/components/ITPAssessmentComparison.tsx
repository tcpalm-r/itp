'use client';

import React, { useState, useEffect } from 'react';
import { AssessmentComparison, BehaviorComparison, ITPVirtue } from '@/types';
import { VIRTUE_CONFIG } from '@/lib/itpBehaviors';
import { ITPBehaviorComparisonRow } from './ITPBehaviorComparisonRow';
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Lightbulb,
  RefreshCw,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react';

interface ITPAssessmentComparisonProps {
  employeeId: string;
  employeeName: string;
  managerId: string;
  onBack: () => void;
}

interface AITip {
  tip: string;
  behaviorContext?: string;
}

export function ITPAssessmentComparison({
  employeeId,
  employeeName,
  managerId,
  onBack,
}: ITPAssessmentComparisonProps) {
  const [comparison, setComparison] = useState<AssessmentComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiTips, setAiTips] = useState<AITip[]>([]);
  const [aiTipsLoading, setAiTipsLoading] = useState(false);
  const [aiTipsError, setAiTipsError] = useState<string | null>(null);

  useEffect(() => {
    loadComparison();
  }, [employeeId, managerId]);

  const loadComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/itp/assessments/compare?employee_id=${employeeId}&manager_id=${managerId}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load comparison');
      setComparison(data.comparison);

      // Load AI tips if there are significant differences
      const significantDiffs = data.comparison.behaviors.filter(
        (b: BehaviorComparison) => b.hasSignificantDifference
      );
      if (significantDiffs.length > 0) {
        loadAiTips(significantDiffs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const loadAiTips = async (significantDifferences: BehaviorComparison[]) => {
    try {
      setAiTipsLoading(true);
      setAiTipsError(null);

      const response = await fetch('/api/itp/ai-tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeName,
          significantDifferences,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate tips');
      setAiTips(data.tips || []);
    } catch (err) {
      setAiTipsError(err instanceof Error ? err.message : 'Failed to generate tips');
    } finally {
      setAiTipsLoading(false);
    }
  };

  const retryAiTips = () => {
    if (!comparison) return;
    const significantDiffs = comparison.behaviors.filter((b) => b.hasSignificantDifference);
    if (significantDiffs.length > 0) {
      loadAiTips(significantDiffs);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-sonance-cyan" />
        <span className="ml-3 text-muted-foreground">Loading comparison...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={onBack}
          className="mb-6 text-sm text-muted-foreground hover:text-sonance-charcoal transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to team list
        </button>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5" />
            <span className="font-medium">Error loading comparison</span>
          </div>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadComparison}
            className="mt-4 inline-flex items-center px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!comparison) {
    return null;
  }

  const hasSelfAssessment = comparison.selfAssessment !== null;
  const significantDifferences = comparison.behaviors.filter((b) => b.hasSignificantDifference);
  const hasSignificantDifferences = significantDifferences.length > 0;

  // Group behaviors by virtue
  const behaviorsByVirtue: Record<ITPVirtue, BehaviorComparison[]> = {
    humble: comparison.behaviors.filter((b) => b.virtue === 'humble'),
    hungry: comparison.behaviors.filter((b) => b.virtue === 'hungry'),
    people_smart: comparison.behaviors.filter((b) => b.virtue === 'people_smart'),
  };

  // Calculate average scores per virtue
  const calculateVirtueAverages = (behaviors: BehaviorComparison[]) => {
    const managerRatings = behaviors
      .map((b) => b.managerRating)
      .filter((r): r is number => r !== null);
    const selfRatings = behaviors.map((b) => b.selfRating).filter((r): r is number => r !== null);

    return {
      managerAvg:
        managerRatings.length > 0
          ? (managerRatings.reduce((a, b) => a + b, 0) / managerRatings.length).toFixed(1)
          : 'N/A',
      selfAvg:
        selfRatings.length > 0
          ? (selfRatings.reduce((a, b) => a + b, 0) / selfRatings.length).toFixed(1)
          : 'N/A',
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-sonance-charcoal transition-colors flex items-center gap-1"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to team list
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-sonance-charcoal mb-2">
          Assessment Comparison: {employeeName}
        </h2>
        <p className="text-muted-foreground text-sm">
          Compare your manager assessment with {employeeName}&apos;s self-assessment
        </p>

        {/* Legend */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-sonance-charcoal" />
            <span className="text-sm text-muted-foreground">You</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-neutral-400" />
            <span className="text-sm text-muted-foreground">{employeeName.split(' ')[0]}</span>
          </div>
        </div>
      </div>

      {/* No self-assessment notice */}
      {!hasSelfAssessment && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-blue-800 font-medium">Self-assessment not yet completed</p>
              <p className="text-blue-700 text-sm mt-1">
                {employeeName} has not submitted their self-assessment yet. Your manager assessment
                is shown below. Once they complete their self-assessment, you&apos;ll be able to see a
                full comparison.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['humble', 'hungry', 'people_smart'] as ITPVirtue[]).map((virtue) => {
          const config = VIRTUE_CONFIG[virtue];
          const behaviors = behaviorsByVirtue[virtue];
          const averages = calculateVirtueAverages(behaviors);
          const hasGaps = behaviors.some((b) => b.hasSignificantDifference);

          return (
            <div
              key={virtue}
              className={`rounded-xl border-2 p-4 ${config.borderColor}`}
              style={{
                background: `linear-gradient(135deg, ${config.bgColor.replace('bg-[', '').replace(']', '')} 0%, white 100%)`,
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.accentColor }}
                />
                <h3 className="font-semibold text-sonance-charcoal">{config.displayName}</h3>
                {hasGaps && <AlertTriangle className="w-4 h-4 text-red-400 ml-auto" />}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">You</p>
                  <p className="text-2xl font-bold text-sonance-charcoal">{averages.managerAvg}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{employeeName.split(' ')[0]}</p>
                  <p className="text-2xl font-bold text-neutral-500">{averages.selfAvg}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall alignment indicator */}
      {hasSelfAssessment && !hasSignificantDifferences && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-emerald-800 font-medium">Great alignment!</p>
              <p className="text-emerald-700 text-sm mt-1">
                Your assessment and {employeeName}&apos;s self-assessment are well aligned. There are no
                significant differences (4+ points) in any behaviors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Areas Needing Discussion */}
      {hasSignificantDifferences && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <MessageSquare className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sonance-charcoal font-medium">
                Areas needing discussion ({significantDifferences.length})
              </p>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                The following behaviors have a significant difference (4+ points) between your
                assessment and {employeeName}&apos;s self-assessment. Consider discussing these in your
                next 1-on-1.
              </p>
              <div className="space-y-3">
                {significantDifferences.map((behavior) => (
                  <div
                    key={behavior.behaviorKey}
                    className="bg-white rounded-lg p-3 border border-red-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sonance-charcoal">
                        {behavior.behaviorName}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        You: {behavior.managerRating} | {employeeName.split(' ')[0]}: {behavior.selfRating}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {VIRTUE_CONFIG[behavior.virtue].displayName}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Tips Section */}
      {hasSignificantDifferences && (
        <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-neutral-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sonance-charcoal font-medium">Conversation Tips</p>
                {aiTipsError && (
                  <button
                    onClick={retryAiTips}
                    className="text-sm text-neutral-600 hover:text-sonance-charcoal flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Retry
                  </button>
                )}
              </div>

              {aiTipsLoading && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Generating personalized tips...</span>
                </div>
              )}

              {aiTipsError && !aiTipsLoading && (
                <p className="text-sm text-muted-foreground">
                  Unable to generate tips at this time. Click retry to try again.
                </p>
              )}

              {!aiTipsLoading && !aiTipsError && aiTips.length > 0 && (
                <ul className="space-y-3">
                  {aiTips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-sonance-charcoal font-bold text-sm mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="text-sonance-charcoal text-sm">{tip.tip}</span>
                    </li>
                  ))}
                </ul>
              )}

              {!aiTipsLoading && !aiTipsError && aiTips.length === 0 && (
                <p className="text-sm text-muted-foreground">No tips available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Comparison by Virtue */}
      {(['humble', 'hungry', 'people_smart'] as ITPVirtue[]).map((virtue) => {
        const config = VIRTUE_CONFIG[virtue];
        const behaviors = behaviorsByVirtue[virtue];

        return (
          <div
            key={virtue}
            className={`rounded-xl border-2 ${config.borderColor} overflow-hidden shadow-sm`}
          >
            <div
              className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}
              style={{
                background: `linear-gradient(135deg, ${config.bgColor.replace('bg-[', '').replace(']', '')} 0%, white 100%)`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.accentColor }}
                />
                <h3 className={`text-xl font-semibold ${config.color}`}>{config.displayName}</h3>
              </div>
            </div>

            <div className="p-5 bg-white space-y-3">
              {behaviors.map((behavior) => (
                <ITPBehaviorComparisonRow key={behavior.behaviorKey} comparison={behavior} employeeName={employeeName} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ITPAssessmentComparison;
