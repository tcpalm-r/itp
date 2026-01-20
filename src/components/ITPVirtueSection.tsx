'use client';

import { ITPBehavior, ITPVirtue } from '@/types';
import { VIRTUE_CONFIG } from '@/lib/itpBehaviors';
import ITPBehaviorSlider from './ITPBehaviorSlider';

interface ITPVirtueSectionProps {
  virtue: ITPVirtue;
  behaviors: ITPBehavior[];
  ratings: Record<string, number>;
  onRatingChange: (behaviorKey: string, rating: number) => void;
  disabled?: boolean;
}

export default function ITPVirtueSection({
  virtue,
  behaviors,
  ratings,
  onRatingChange,
  disabled = false,
}: ITPVirtueSectionProps) {
  const config = VIRTUE_CONFIG[virtue];
  const ratedCount = behaviors.filter((b) => ratings[b.behaviorKey]).length;

  return (
    <div
      className={`rounded-lg border-2 ${config.borderColor} ${config.bgColor} p-6 mb-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-xl font-semibold ${config.color}`}>
          {config.displayName}
        </h3>
        <span className="text-sm text-gray-500">
          {ratedCount}/{behaviors.length} rated
        </span>
      </div>

      <div className="bg-white rounded-lg p-4">
        {behaviors.map((behavior) => (
          <ITPBehaviorSlider
            key={behavior.behaviorKey}
            behavior={behavior}
            value={ratings[behavior.behaviorKey] || null}
            onChange={onRatingChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}
