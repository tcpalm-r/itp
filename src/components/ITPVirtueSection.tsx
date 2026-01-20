'use client';

import React from 'react';
import { ITPBehavior, ITPVirtue } from '@/types';
import { VIRTUE_CONFIG } from '@/lib/itpBehaviors';
import { ITPBehaviorSlider } from './ITPBehaviorSlider';

interface ITPVirtueSectionProps {
  virtue: ITPVirtue;
  behaviors: ITPBehavior[];
  responses: Record<string, number>;
  onResponseChange: (behaviorKey: string, rating: number) => void;
  disabled?: boolean;
}

export function ITPVirtueSection({
  virtue,
  behaviors,
  responses,
  onResponseChange,
  disabled = false,
}: ITPVirtueSectionProps) {
  const config = VIRTUE_CONFIG[virtue];

  return (
    <div className={`mb-8 rounded-xl border-2 ${config.borderColor} overflow-hidden`}>
      <div className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}>
        <h3 className={`text-xl font-bold ${config.color}`}>
          {config.displayName}
        </h3>
      </div>

      <div className="p-4 bg-white">
        {behaviors.map((behavior) => (
          <ITPBehaviorSlider
            key={behavior.behaviorKey}
            behavior={behavior}
            value={responses[behavior.behaviorKey] ?? null}
            onChange={onResponseChange}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

export default ITPVirtueSection;
