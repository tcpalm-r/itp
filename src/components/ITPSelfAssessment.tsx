'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ITPAssessment, UserProfile, SaveStatus } from '@/types';
import { getBehaviorsByVirtue, ITP_BEHAVIORS } from '@/lib/itpBehaviors';
import ITPVirtueSection from './ITPVirtueSection';
import ITPAssessmentHistory from './ITPAssessmentHistory';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Save,
  Send,
  RotateCcw,
  LogOut,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ITPSelfAssessmentProps {
  user: UserProfile;
}

export default function ITPSelfAssessment({ user }: ITPSelfAssessmentProps) {
  const router = useRouter();
  const [assessments, setAssessments] = useState<ITPAssessment[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<ITPAssessment | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingChanges = useRef<Record<string, number>>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const behaviorsByVirtue = getBehaviorsByVirtue();

  // Fetch assessments on mount
  useEffect(() => {
    fetchAssessments();
  }, []);

  // Auto-save on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && Object.keys(pendingChanges.current).length > 0) {
        saveDraft(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [currentAssessment]);

  const fetchAssessments = async () => {
    try {
      const response = await fetch(`/api/itp/assessments?employee_id=${user.id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch assessments');
      }

      setAssessments(data.assessments || []);

      // Find draft or submitted assessment
      const draft = data.assessments?.find((a: ITPAssessment) => a.status === 'draft');
      const submitted = data.assessments?.find((a: ITPAssessment) => a.status === 'submitted');

      if (draft) {
        setCurrentAssessment(draft);
        // Load existing ratings
        const existingRatings: Record<string, number> = {};
        draft.responses?.forEach((r: { behavior_key: string; rating: number }) => {
          existingRatings[r.behavior_key] = r.rating;
        });
        setRatings(existingRatings);
      } else if (submitted) {
        setCurrentAssessment(submitted);
        // Load submitted ratings
        const existingRatings: Record<string, number> = {};
        submitted.responses?.forEach((r: { behavior_key: string; rating: number }) => {
          existingRatings[r.behavior_key] = r.rating;
        });
        setRatings(existingRatings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessments');
    } finally {
      setLoading(false);
    }
  };

  const createAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/itp/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: user.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409 && data.existingId) {
          // Draft already exists, fetch it
          await fetchAssessments();
          return;
        }
        throw new Error(data.error || 'Failed to create assessment');
      }

      setCurrentAssessment(data.assessment);
      setRatings({});
      setAssessments((prev) => [data.assessment, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create assessment');
    } finally {
      setLoading(false);
    }
  };

  const saveDraft = useCallback(
    async (immediate = false) => {
      if (!currentAssessment || currentAssessment.status !== 'draft') return;
      if (Object.keys(pendingChanges.current).length === 0) return;

      const changesToSave = { ...pendingChanges.current };
      pendingChanges.current = {};

      setSaveStatus('saving');

      try {
        const response = await fetch(
          `/api/itp/assessments/${currentAssessment.id}/save-draft`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              responses: Object.entries(changesToSave).map(([behaviorKey, rating]) => ({
                behaviorKey,
                rating,
              })),
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to save');
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        // Re-queue failed changes
        pendingChanges.current = { ...changesToSave, ...pendingChanges.current };
      }
    },
    [currentAssessment]
  );

  const handleRatingChange = (behaviorKey: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [behaviorKey]: rating }));
    pendingChanges.current[behaviorKey] = rating;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (2 seconds)
    saveTimeoutRef.current = setTimeout(() => {
      saveDraft();
    }, 2000);
  };

  const handleSubmit = async () => {
    if (!currentAssessment) return;

    // Check all behaviors are rated
    const missingBehaviors = ITP_BEHAVIORS.filter(
      (b) => !ratings[b.behaviorKey]
    );

    if (missingBehaviors.length > 0) {
      setError(
        `Please rate all behaviors. Missing: ${missingBehaviors.map((b) => b.behaviorName).join(', ')}`
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    // Save any pending changes first
    if (Object.keys(pendingChanges.current).length > 0) {
      await saveDraft(true);
    }

    try {
      const response = await fetch(
        `/api/itp/assessments/${currentAssessment.id}/submit`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit');
      }

      // Refresh assessments
      await fetchAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartNew = async () => {
    // Archive current submitted assessment by creating a new draft
    setRatings({});
    setCurrentAssessment(null);
    await createAssessment();
  };

  const handleReset = async () => {
    if (!currentAssessment || currentAssessment.status !== 'draft') return;

    if (!confirm('Are you sure you want to reset? This will delete all your current ratings.')) {
      return;
    }

    try {
      await fetch(`/api/itp/assessments/${currentAssessment.id}`, {
        method: 'DELETE',
      });
      setRatings({});
      setCurrentAssessment(null);
      await fetchAssessments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset assessment');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const ratedCount = Object.keys(ratings).length;
  const totalBehaviors = ITP_BEHAVIORS.length;
  const progressPercent = (ratedCount / totalBehaviors) * 100;
  const isComplete = ratedCount === totalBehaviors;
  const isDraft = currentAssessment?.status === 'draft';
  const isSubmitted = currentAssessment?.status === 'submitted';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                ITP Self-Assessment
              </h1>
              <p className="text-sm text-gray-600">
                {user.full_name} ({user.email})
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Save Status */}
              {isDraft && (
                <div className="flex items-center gap-2 text-sm">
                  {saveStatus === 'saving' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-blue-600">Saving...</span>
                    </>
                  )}
                  {saveStatus === 'saved' && (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Saved</span>
                    </>
                  )}
                  {saveStatus === 'error' && (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">Save failed</span>
                    </>
                  )}
                </div>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {(isDraft || isSubmitted) && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">
                  {ratedCount} of {totalBehaviors} behaviors rated
                </span>
                <span className={isComplete ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  {Math.round(progressPercent)}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isComplete ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-800 hover:text-red-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* No assessment - start new */}
        {!currentAssessment && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Welcome to your ITP Self-Assessment
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Rate yourself on 12 behaviors across three virtues: Humble, Hungry,
              and People Smart. Your progress will be saved automatically.
            </p>
            <button
              onClick={createAssessment}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Start Self-Assessment
            </button>
          </div>
        )}

        {/* Submitted assessment - view only */}
        {isSubmitted && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  Assessment submitted on{' '}
                  {new Date(currentAssessment.submitted_at!).toLocaleDateString()}
                </span>
              </div>
              <button
                onClick={handleStartNew}
                className="text-sm text-green-700 hover:text-green-800 font-medium"
              >
                Start new assessment
              </button>
            </div>
          </div>
        )}

        {/* Assessment form */}
        {currentAssessment && (
          <>
            <ITPVirtueSection
              virtue="humble"
              behaviors={behaviorsByVirtue.humble}
              ratings={ratings}
              onRatingChange={handleRatingChange}
              disabled={isSubmitted}
            />
            <ITPVirtueSection
              virtue="hungry"
              behaviors={behaviorsByVirtue.hungry}
              ratings={ratings}
              onRatingChange={handleRatingChange}
              disabled={isSubmitted}
            />
            <ITPVirtueSection
              virtue="people_smart"
              behaviors={behaviorsByVirtue.people_smart}
              ratings={ratings}
              onRatingChange={handleRatingChange}
              disabled={isSubmitted}
            />

            {/* Action buttons for draft */}
            {isDraft && (
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => saveDraft(true)}
                    disabled={Object.keys(pendingChanges.current).length === 0}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isComplete || submitting}
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Submit Assessment
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Assessment History */}
        <ITPAssessmentHistory assessments={assessments} />
      </main>
    </div>
  );
}
