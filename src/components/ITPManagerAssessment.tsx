'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ITPAssessment, ITPVirtue } from '@/types';
import { getBehaviorsByVirtue, getAllBehaviorKeys } from '@/lib/itpBehaviors';
import { ITPVirtueSection } from './ITPVirtueSection';
import { Loader2, Save, Send, Plus, CheckCircle, AlertCircle, Clock, RotateCcw } from 'lucide-react';

interface ITPManagerAssessmentProps {
  employeeId: string;
  employeeName: string;
  managerId: string;
  onBack: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function ITPManagerAssessment({
  employeeId,
  employeeName,
  managerId,
  onBack,
}: ITPManagerAssessmentProps) {
  const [assessments, setAssessments] = useState<ITPAssessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<ITPAssessment | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Record<string, number>>({});

  const behaviorsByVirtue = getBehaviorsByVirtue();
  const allBehaviorKeys = getAllBehaviorKeys();

  const loadAssessments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/itp/assessments?employee_id=${employeeId}&assessment_type=manager&assessor_id=${managerId}`
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load assessments');

      setAssessments(data.assessments || []);
      const draft = data.assessments?.find((a: ITPAssessment) => a.status === 'draft');
      const submitted = data.assessments?.find((a: ITPAssessment) => a.status === 'submitted');

      if (draft) {
        setCurrentAssessment(draft);
        const responseMap: Record<string, number> = {};
        draft.responses?.forEach((r: any) => {
          responseMap[r.behaviorKey || r.behavior_key] = r.rating;
        });
        setResponses(responseMap);
      } else if (submitted) {
        setCurrentAssessment(submitted);
        const responseMap: Record<string, number> = {};
        submitted.responses?.forEach((r: any) => {
          responseMap[r.behaviorKey || r.behavior_key] = r.rating;
        });
        setResponses(responseMap);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  }, [employeeId, managerId]);

  useEffect(() => {
    loadAssessments();
  }, [loadAssessments]);

  const createAssessment = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/itp/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          assessment_type: 'manager',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 409 && data.existingId) {
          await loadAssessments();
          return;
        }
        throw new Error(data.error || 'Failed to create assessment');
      }
      setCurrentAssessment(data.assessment);
      setResponses({});
      await loadAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = useCallback(
    async (changesToSave: Record<string, number>, throwOnError = false) => {
      if (!currentAssessment || currentAssessment.status !== 'draft') return;
      const responseArray = Object.entries(changesToSave).map(([behaviorKey, rating]) => ({
        behaviorKey,
        rating,
      }));
      if (responseArray.length === 0) return;

      try {
        setSaveStatus('saving');
        const response = await fetch(`/api/itp/assessments/${currentAssessment.id}/save-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses: responseArray }),
        });
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to save draft');
        }
        setSaveStatus('saved');
        pendingChangesRef.current = {};
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (err) {
        setSaveStatus('error');
        if (throwOnError) throw err;
      }
    },
    [currentAssessment]
  );

  const handleResponseChange = useCallback(
    (behaviorKey: string, rating: number) => {
      setResponses((prev) => {
        const updated = { ...prev, [behaviorKey]: rating };
        pendingChangesRef.current[behaviorKey] = rating;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        if (currentAssessment?.status === 'draft') {
          saveTimeoutRef.current = setTimeout(() => {
            saveDraft(pendingChangesRef.current);
          }, 2000);
        }
        return updated;
      });
    },
    [currentAssessment, saveDraft]
  );

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && Object.keys(pendingChangesRef.current).length > 0) {
        saveDraft(pendingChangesRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveDraft]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const submitAssessment = async () => {
    if (!currentAssessment) return;

    try {
      setSubmitting(true);
      setError(null);

      // Save all current responses before submitting
      if (Object.keys(responses).length > 0) {
        await saveDraft(responses, true);
        pendingChangesRef.current = {};
      }

      const response = await fetch(`/api/itp/assessments/${currentAssessment.id}/submit`, {
        method: 'POST',
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.missingBehaviors) {
          throw new Error(
            `Please rate all behaviors before submitting. Missing: ${data.missingBehaviors.join(', ')}`
          );
        }
        throw new Error(data.error || 'Failed to submit assessment');
      }
      await loadAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const resetDraft = async () => {
    if (!currentAssessment || currentAssessment.status !== 'draft') return;
    if (!confirm('Are you sure you want to reset? This will clear all your current responses.'))
      return;
    try {
      setResetting(true);
      setError(null);
      const response = await fetch(`/api/itp/assessments/${currentAssessment.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reset assessment');
      }
      setResponses({});
      setCurrentAssessment(null);
      pendingChangesRef.current = {};
      await loadAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset assessment');
    } finally {
      setResetting(false);
    }
  };

  const completedCount = Object.keys(responses).length;
  const totalCount = allBehaviorKeys.length;
  const isComplete = completedCount === totalCount;
  const isDraft = currentAssessment?.status === 'draft';
  const isSubmitted = currentAssessment?.status === 'submitted';
  const canEdit = isDraft;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-sonance-cyan" />
        <span className="ml-3 text-muted-foreground">Loading assessment...</span>
      </div>
    );
  }

  // No current assessment - show start button
  if (!currentAssessment) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={onBack}
          className="mb-6 text-sm text-muted-foreground hover:text-sonance-charcoal transition-colors"
        >
          &larr; Back to team list
        </button>
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-sonance-charcoal mb-3">
            Assess {employeeName}
          </h3>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Complete the Ideal Team Player assessment for {employeeName} by evaluating them across
            12 core behaviors in three virtues: Humble, Hungry, and People Smart.
          </p>
          <button
            onClick={createAssessment}
            className="inline-flex items-center px-5 py-2.5 bg-sonance-charcoal text-white rounded-lg hover:bg-sonance-charcoal-light transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            <Plus className="w-4 h-4 mr-2" />
            Start Assessment
          </button>
          {error && <div className="mt-4 text-red-600 text-sm">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-sonance-charcoal transition-colors"
      >
        &larr; Back to team list
      </button>

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-sonance-charcoal">
            Assessment for {employeeName}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          {isDraft && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <Clock className="w-4 h-4 mr-1.5" />
              Draft
            </span>
          )}
          {isSubmitted && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle className="w-4 h-4 mr-1.5" />
              Submitted
            </span>
          )}
          {canEdit && (
            <div className="flex items-center text-sm">
              {saveStatus === 'saving' && (
                <span className="text-muted-foreground flex items-center">
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="text-emerald-600 flex items-center">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="text-red-600 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Save failed
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-sonance-charcoal">Overall Progress</span>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalCount} behaviors rated
          </span>
        </div>
        <div className="h-3 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isComplete ? 'bg-emerald-500' : 'bg-sonance-cyan'
            }`}
            style={{ width: `${(completedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
            {error}
          </div>
        </div>
      )}

      {/* Virtue Sections */}
      {(['humble', 'hungry', 'people_smart'] as ITPVirtue[]).map((virtue) => (
        <ITPVirtueSection
          key={virtue}
          virtue={virtue}
          behaviors={behaviorsByVirtue[virtue]}
          responses={responses}
          onResponseChange={handleResponseChange}
          disabled={!canEdit}
        />
      ))}

      {/* Action Buttons */}
      {canEdit && (
        <div className="flex justify-between pt-6 border-t border-neutral-200">
          <button
            onClick={resetDraft}
            disabled={resetting}
            className="inline-flex items-center px-4 py-2.5 border border-neutral-200 rounded-lg text-muted-foreground bg-white hover:bg-neutral-50 hover:text-sonance-charcoal transition-all duration-200 disabled:opacity-50 font-medium"
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset
          </button>
          <div className="flex gap-3">
            <button
              onClick={() => saveDraft(responses)}
              disabled={saveStatus === 'saving'}
              className="inline-flex items-center px-4 py-2.5 border border-neutral-200 rounded-lg text-sonance-charcoal bg-white hover:bg-neutral-50 transition-all duration-200 disabled:opacity-50 font-medium"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </button>
            <button
              onClick={submitAssessment}
              disabled={!isComplete || submitting}
              className="inline-flex items-center px-5 py-2.5 bg-sonance-cyan text-white rounded-lg hover:bg-sonance-cyan-dark transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow-md"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Assessment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
