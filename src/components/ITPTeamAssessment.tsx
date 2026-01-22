'use client';

import { useState, useEffect, useCallback } from 'react';
import { DirectReport } from '@/types';
import { ITPTeamAssessmentList } from './ITPTeamAssessmentList';
import { ITPManagerAssessment } from './ITPManagerAssessment';

interface ITPTeamAssessmentProps {
  managerId: string;
}

export function ITPTeamAssessment({ managerId }: ITPTeamAssessmentProps) {
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/itp/direct-reports');
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load direct reports');
      }
      setDirectReports(data.directReports || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load direct reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectReports();
  }, [fetchDirectReports]);

  const handleBack = useCallback(() => {
    setSelectedEmployeeId(null);
    // Refresh the list to get updated status
    fetchDirectReports();
  }, [fetchDirectReports]);

  const selectedEmployee = directReports.find((dr) => dr.id === selectedEmployeeId);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchDirectReports}
          className="mt-4 text-sm text-sonance-cyan hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (selectedEmployeeId && selectedEmployee) {
    return (
      <ITPManagerAssessment
        employeeId={selectedEmployeeId}
        employeeName={selectedEmployee.full_name || selectedEmployee.email}
        managerId={managerId}
        onBack={handleBack}
      />
    );
  }

  return (
    <ITPTeamAssessmentList
      directReports={directReports}
      onSelectEmployee={setSelectedEmployeeId}
      loading={loading}
    />
  );
}
