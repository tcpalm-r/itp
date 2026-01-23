'use client';

import React from 'react';
import { BehaviorComparison } from '@/types';
import { AlertTriangle } from 'lucide-react';

interface ITPBehaviorComparisonRowProps {
  comparison: BehaviorComparison;
  employeeName: string;
}

export function ITPBehaviorComparisonRow({ comparison, employeeName }: ITPBehaviorComparisonRowProps) {
  const { behaviorName, managerRating, selfRating, hasSignificantDifference } = comparison;

  const getRatingPosition = (rating: number | null) => {
    if (rating === null) return 0;
    // Convert 1-10 scale to 0-100% position
    return ((rating - 1) / 9) * 100;
  };

  const getRatingLabel = (rating: number | null) => {
    if (rating === null) return 'N/A';
    return rating.toString();
  };

  return (
    <div
      className={`p-4 rounded-lg border ${
        hasSignificantDifference
          ? 'border-red-200 bg-red-50'
          : 'border-neutral-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sonance-charcoal">{behaviorName}</span>
          {hasSignificantDifference && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
              <AlertTriangle className="w-3 h-3" />
              Significant gap
            </span>
          )}
        </div>
        {comparison.difference !== null && (
          <span className="text-sm text-muted-foreground">
            {comparison.difference} point difference
          </span>
        )}
      </div>

      {/* Rating bars */}
      <div className="space-y-2">
        {/* Manager rating bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">You</span>
          <div className="flex-1 relative h-6 bg-neutral-100 rounded-full overflow-hidden">
            {/* Scale markers */}
            <div className="absolute inset-0 flex justify-between px-1 items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="w-0.5 h-3 bg-neutral-300 rounded" />
              ))}
            </div>
            {/* Rating indicator */}
            {managerRating !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-sonance-charcoal border-2 border-white shadow-md flex items-center justify-center transition-all duration-300"
                style={{ left: `calc(${getRatingPosition(managerRating)}% - 12px + ${getRatingPosition(managerRating) < 50 ? 12 : -12}px + ${getRatingPosition(managerRating) === 0 ? 12 : getRatingPosition(managerRating) === 100 ? -12 : 0}px)` }}
              >
                <span className="text-xs font-bold text-white">{managerRating}</span>
              </div>
            )}
          </div>
          <span className="text-sm font-medium w-8 text-right text-sonance-charcoal">
            {getRatingLabel(managerRating)}
          </span>
        </div>

        {/* Self rating bar */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-20 shrink-0">{employeeName.split(' ')[0]}</span>
          <div className="flex-1 relative h-6 bg-neutral-100 rounded-full overflow-hidden">
            {/* Scale markers */}
            <div className="absolute inset-0 flex justify-between px-1 items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="w-0.5 h-3 bg-neutral-300 rounded" />
              ))}
            </div>
            {/* Rating indicator */}
            {selfRating !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-neutral-400 border-2 border-white shadow-md flex items-center justify-center transition-all duration-300"
                style={{ left: `calc(${getRatingPosition(selfRating)}% - 12px + ${getRatingPosition(selfRating) < 50 ? 12 : -12}px + ${getRatingPosition(selfRating) === 0 ? 12 : getRatingPosition(selfRating) === 100 ? -12 : 0}px)` }}
              >
                <span className="text-xs font-bold text-white">{selfRating}</span>
              </div>
            )}
            {selfRating === null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Not completed</span>
              </div>
            )}
          </div>
          <span className="text-sm font-medium w-8 text-right text-neutral-500">
            {getRatingLabel(selfRating)}
          </span>
        </div>
      </div>

      {/* Scale labels */}
      <div className="flex justify-between mt-2 px-19 text-xs text-muted-foreground">
        <span className="ml-16">1</span>
        <span>5</span>
        <span className="mr-8">10</span>
      </div>
    </div>
  );
}

export default ITPBehaviorComparisonRow;
